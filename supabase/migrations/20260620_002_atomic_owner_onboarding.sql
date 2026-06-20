-- AFRICRM Shop
-- Migration 002 : onboarding Owner atomique
-- Date : 2026-06-20
--
-- Cette migration est additive :
-- - aucune table ni colonne existante n'est modifiée ;
-- - la fonction est réservée au service_role ;
-- - PostgreSQL annule automatiquement toutes les insertions si une étape échoue.

begin;

create or replace function public.africrm_create_owner_business(
  p_owner_user_id uuid,
  p_name text,
  p_legal_name text,
  p_slug_base text,
  p_activity_type_code text,
  p_plan_code text,
  p_phone text,
  p_store_name text,
  p_store_code text,
  p_city text
)
returns table (
  business_id uuid,
  store_id uuid,
  business_slug text,
  trial_ends_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner_email text;
  v_activity_id uuid;
  v_activity_code text;
  v_plan_id uuid;
  v_plan_name text;
  v_owner_role_id uuid;
  v_business_id uuid;
  v_store_id uuid;
  v_slug text;
  v_trial_ends_at timestamptz := now() + interval '14 days';
begin
  select lower(u.email)
  into v_owner_email
  from public.users u
  where u.id = p_owner_user_id
    and u.status = 'active'
    and u.deleted_at is null;

  if v_owner_email is null then
    raise exception using
      errcode = 'P0001',
      message = 'OWNER_PROFILE_NOT_FOUND';
  end if;

  select a.id, a.code
  into v_activity_id, v_activity_code
  from public.activity_types a
  where a.code = lower(btrim(p_activity_type_code))
    and a.is_active;

  if v_activity_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'ACTIVITY_TYPE_NOT_FOUND';
  end if;

  select p.id, p.name
  into v_plan_id, v_plan_name
  from public.subscription_plans p
  where p.code = lower(btrim(p_plan_code))
    and p.is_active;

  if v_plan_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'SUBSCRIPTION_PLAN_NOT_FOUND';
  end if;

  select r.id
  into v_owner_role_id
  from public.roles r
  where r.code = 'owner'
    and r.business_id is null
  limit 1;

  if v_owner_role_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'OWNER_ROLE_NOT_FOUND';
  end if;

  v_slug := lower(btrim(p_slug_base));
  if v_slug = '' then
    raise exception using
      errcode = 'P0001',
      message = 'BUSINESS_SLUG_REQUIRED';
  end if;

  if exists (
    select 1
    from public.businesses b
    where b.slug = v_slug
  ) then
    v_slug := v_slug || '-' || encode(gen_random_bytes(3), 'hex');
  end if;

  insert into public.businesses (
    name,
    legal_name,
    slug,
    email,
    phone,
    activity_type_id,
    onboarding_status,
    status,
    trial_ends_at,
    metadata
  )
  values (
    btrim(p_name),
    nullif(btrim(p_legal_name), ''),
    v_slug,
    v_owner_email,
    nullif(btrim(p_phone), ''),
    v_activity_id,
    'store_created',
    'trial',
    v_trial_ends_at,
    jsonb_build_object(
      'activity_type', v_activity_code,
      'subscription_plan', v_plan_name,
      'created_via', 'owner_onboarding'
    )
  )
  returning id into v_business_id;

  insert into public.business_settings (business_id, settings)
  values (v_business_id, '{}'::jsonb);

  insert into public.stores (
    business_id,
    name,
    code,
    email,
    phone,
    city,
    status,
    is_headquarters
  )
  values (
    v_business_id,
    btrim(p_store_name),
    upper(btrim(p_store_code)),
    v_owner_email,
    nullif(btrim(p_phone), ''),
    btrim(p_city),
    'active',
    true
  )
  returning id into v_store_id;

  insert into public.business_owners (
    business_id,
    user_id,
    status,
    is_primary,
    accepted_at
  )
  values (
    v_business_id,
    p_owner_user_id,
    'active',
    true,
    now()
  );

  update public.users as u
  set business_id = v_business_id
  where u.id = p_owner_user_id
    and u.business_id is null;

  insert into public.user_roles (
    user_id,
    role_id,
    business_id,
    store_id,
    assigned_by
  )
  values (
    p_owner_user_id,
    v_owner_role_id,
    v_business_id,
    null,
    p_owner_user_id
  )
  on conflict do nothing;

  insert into public.business_subscriptions (
    business_id,
    plan_id,
    status,
    trial_ends_at,
    current_period_start,
    current_period_end,
    metadata
  )
  values (
    v_business_id,
    v_plan_id,
    'trialing',
    v_trial_ends_at,
    now(),
    v_trial_ends_at,
    jsonb_build_object('source', 'owner_onboarding')
  );

  insert into public.audit_logs (
    business_id,
    user_id,
    action,
    table_name,
    record_id,
    new_values
  )
  values (
    v_business_id,
    p_owner_user_id,
    'owner.business.created',
    'businesses',
    v_business_id,
    jsonb_build_object(
      'name', btrim(p_name),
      'activity_type', v_activity_code,
      'plan', lower(btrim(p_plan_code)),
      'store_id', v_store_id
    )
  );

  return query
  select v_business_id, v_store_id, v_slug, v_trial_ends_at;
end;
$$;

revoke all on function public.africrm_create_owner_business(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.africrm_create_owner_business(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;

comment on function public.africrm_create_owner_business(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) is 'Crée atomiquement une entreprise Owner, son magasin principal, son ownership, son rôle et son abonnement d’essai.';

commit;
