-- POS v4 — Encaissement transactionnel
-- Objectif : créer une vente POS complète dans une seule transaction PostgreSQL.
-- Cette migration ne supprime aucune table et ne modifie pas l'architecture existante.

create or replace function public.africrm_create_pos_sale(
  p_store_id uuid,
  p_items jsonb,
  p_payment_method_id uuid default null,
  p_payment_provider text default 'cash',
  p_payment_reference text default null,
  p_notes text default null,
  p_cashier_user_id uuid default null
)
returns table (
  sale_id uuid,
  receipt_number text,
  total_amount numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_store record;
  v_payment_method record;
  v_payment_provider text;
  v_payment_code text;
  v_payment_name text;
  v_receipt_number text;
  v_sale_id uuid;
  v_subtotal numeric(14,2);
  v_tax_total numeric(14,2);
  v_total_amount numeric(14,2);
begin
  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'POS_EMPTY_CART';
  end if;

  select s.id, s.business_id, s.name
  into v_store
  from public.stores s
  where s.id = p_store_id
    and s.status = 'active'
    and s.deleted_at is null
  for update;

  if v_store.id is null then
    raise exception 'POS_STORE_NOT_FOUND';
  end if;

  v_payment_provider := coalesce(nullif(btrim(p_payment_provider), ''), 'cash');

  if p_payment_method_id is not null then
    select pm.id, pm.business_id, pm.provider, pm.requires_reference
    into v_payment_method
    from public.payment_methods pm
    where pm.id = p_payment_method_id
      and pm.business_id = v_store.business_id
      and pm.is_enabled = true;

    if v_payment_method.id is null then
      raise exception 'POS_PAYMENT_METHOD_INVALID';
    end if;

    if v_payment_method.requires_reference
       and nullif(btrim(coalesce(p_payment_reference, '')), '') is null then
      raise exception 'POS_PAYMENT_REFERENCE_REQUIRED';
    end if;

    v_payment_provider := v_payment_method.provider;
  else
    if v_payment_provider = 'mobile_money' then
      v_payment_code := 'mobile_money';
      v_payment_name := 'Mobile Money';
    else
      v_payment_provider := 'cash';
      v_payment_code := 'cash';
      v_payment_name := 'Espèces';
    end if;

    select pm.id, pm.business_id, pm.provider, pm.requires_reference
    into v_payment_method
    from public.payment_methods pm
    where pm.business_id = v_store.business_id
      and pm.code = v_payment_code
      and pm.is_enabled = true
    limit 1;

    if v_payment_method.id is null then
      insert into public.payment_methods (
        business_id,
        name,
        code,
        provider,
        is_enabled,
        requires_reference,
        display_order,
        configuration
      )
      values (
        v_store.business_id,
        v_payment_name,
        v_payment_code,
        v_payment_provider::public.payment_provider,
        true,
        false,
        case when v_payment_provider = 'cash' then 1 else 2 end,
        '{}'::jsonb
      )
      returning id, business_id, provider, requires_reference
      into v_payment_method;
    end if;
  end if;

  create temp table pg_temp.pos_items_to_sell (
    product_id uuid primary key,
    quantity numeric(14,3) not null check (quantity > 0)
  ) on commit drop;

  insert into pg_temp.pos_items_to_sell (product_id, quantity)
  select
    parsed.product_id,
    sum(parsed.quantity)::numeric(14,3)
  from jsonb_to_recordset(p_items) as parsed(product_id uuid, quantity numeric)
  where parsed.product_id is not null
    and parsed.quantity is not null
    and parsed.quantity > 0
  group by parsed.product_id;

  if not exists (select 1 from pg_temp.pos_items_to_sell) then
    raise exception 'POS_EMPTY_CART';
  end if;

  if exists (
    select 1
    from pg_temp.pos_items_to_sell i
    left join public.products p
      on p.id = i.product_id
     and p.business_id = v_store.business_id
     and p.is_active = true
     and p.deleted_at is null
    where p.id is null
  ) then
    raise exception 'POS_PRODUCT_INVALID';
  end if;

  perform 1
  from public.product_stock ps
  join public.products p on p.id = ps.product_id
  join pg_temp.pos_items_to_sell i on i.product_id = ps.product_id
  where ps.business_id = v_store.business_id
    and ps.store_id = v_store.id
    and p.track_inventory = true
  for update of ps;

  if exists (
    select 1
    from public.products p
    join pg_temp.pos_items_to_sell i on i.product_id = p.id
    left join public.product_stock ps
      on ps.business_id = p.business_id
     and ps.store_id = v_store.id
     and ps.product_id = p.id
    where p.business_id = v_store.business_id
      and p.track_inventory = true
      and ps.product_id is null
  ) then
    raise exception 'POS_STOCK_MISSING';
  end if;

  if exists (
    select 1
    from public.products p
    join pg_temp.pos_items_to_sell i on i.product_id = p.id
    join public.product_stock ps
      on ps.business_id = p.business_id
     and ps.store_id = v_store.id
     and ps.product_id = p.id
    where p.business_id = v_store.business_id
      and p.track_inventory = true
      and (ps.quantity - ps.reserved_quantity) < i.quantity
  ) then
    raise exception 'POS_STOCK_LOW';
  end if;

  select
    coalesce(sum(p.selling_price * i.quantity), 0)::numeric(14,2),
    coalesce(sum(p.selling_price * i.quantity * (p.tax_rate / 100)), 0)::numeric(14,2)
  into v_subtotal, v_tax_total
  from pg_temp.pos_items_to_sell i
  join public.products p on p.id = i.product_id
  where p.business_id = v_store.business_id;

  v_total_amount := (v_subtotal + v_tax_total)::numeric(14,2);
  v_receipt_number := 'POS-' ||
    to_char(now(), 'YYYYMMDD') ||
    '-' ||
    upper(right(replace(gen_random_uuid()::text, '-', ''), 6));

  insert into public.sales (
    business_id,
    store_id,
    receipt_number,
    status,
    payment_status,
    currency_code,
    subtotal,
    total_amount,
    paid_amount,
    notes,
    metadata
  )
  values (
    v_store.business_id,
    v_store.id,
    v_receipt_number,
    'completed',
    'completed',
    'XOF',
    v_subtotal,
    v_total_amount,
    v_total_amount,
    nullif(btrim(coalesce(p_notes, '')), ''),
    jsonb_build_object(
      'source', 'africrm_pos_rpc',
      'tax_total', v_tax_total,
      'cashier_user_id', p_cashier_user_id
    )
  )
  returning id into v_sale_id;

  insert into public.sale_items (
    business_id,
    sale_id,
    product_id,
    product_name,
    sku,
    quantity,
    unit_price,
    unit_cost,
    discount_amount,
    tax_rate,
    tax_amount,
    line_total,
    metadata
  )
  select
    v_store.business_id,
    v_sale_id,
    p.id,
    p.name,
    p.sku,
    i.quantity,
    p.selling_price,
    coalesce(p.cost_price, 0),
    0,
    p.tax_rate,
    (p.selling_price * i.quantity * (p.tax_rate / 100))::numeric(14,2),
    (p.selling_price * i.quantity * (1 + (p.tax_rate / 100)))::numeric(14,2),
    jsonb_build_object('product_name', p.name)
  from pg_temp.pos_items_to_sell i
  join public.products p on p.id = i.product_id
  where p.business_id = v_store.business_id;

  insert into public.payments (
    business_id,
    sale_id,
    payment_method_id,
    status,
    amount,
    currency_code,
    provider,
    provider_reference,
    paid_at,
    created_by
  )
  values (
    v_store.business_id,
    v_sale_id,
    v_payment_method.id,
    'completed',
    v_total_amount,
    'XOF',
    v_payment_provider::public.payment_provider,
    nullif(btrim(coalesce(p_payment_reference, '')), ''),
    now(),
    p_cashier_user_id
  );

  update public.product_stock ps
  set
    quantity = ps.quantity - i.quantity,
    updated_at = now()
  from pg_temp.pos_items_to_sell i
  join public.products p on p.id = i.product_id
  where ps.business_id = v_store.business_id
    and ps.store_id = v_store.id
    and ps.product_id = i.product_id
    and p.track_inventory = true;

  insert into public.stock_movements (
    business_id,
    store_id,
    product_id,
    movement_type,
    quantity_delta,
    unit_cost,
    reference_type,
    reference_id,
    reason,
    performed_by,
    metadata
  )
  select
    v_store.business_id,
    v_store.id,
    p.id,
    'sale',
    -i.quantity,
    coalesce(p.cost_price, 0),
    'sale',
    v_sale_id,
    'Vente POS ' || v_receipt_number,
    p_cashier_user_id,
    jsonb_build_object('source', 'africrm_pos_rpc')
  from pg_temp.pos_items_to_sell i
  join public.products p on p.id = i.product_id
  where p.business_id = v_store.business_id
    and p.track_inventory = true;

  return query
  select v_sale_id, v_receipt_number, v_total_amount;
end;
$$;

revoke all on function public.africrm_create_pos_sale(
  uuid,
  jsonb,
  uuid,
  text,
  text,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function public.africrm_create_pos_sale(
  uuid,
  jsonb,
  uuid,
  text,
  text,
  text,
  uuid
) to service_role;
