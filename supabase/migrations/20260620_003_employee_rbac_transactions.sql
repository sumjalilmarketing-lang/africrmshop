-- AFRICRM Shop
-- Migration 003 : invitations et acceptations employé transactionnelles
-- Date : 2026-06-20
-- Migration additive : aucune table existante n'est supprimée ou recréée.

begin;

create or replace function public.africrm_create_employee_invitation(
  p_business_id uuid,
  p_store_id uuid,
  p_role_code text,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_job_title text,
  p_token_hash text,
  p_invited_by uuid
)
returns table (
  invitation_id uuid,
  role_name text,
  invitation_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role_id uuid;
  v_role_name text;
  v_activity_code text;
  v_capabilities jsonb;
  v_limits jsonb;
  v_employee_limit integer;
  v_used_seats integer;
  v_invitation_id uuid;
  v_expires_at timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));

  if not exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.deleted_at is null
      and b.status in ('trial', 'active')
  ) then
    raise exception using errcode = 'P0001', message = 'BUSINESS_NOT_AVAILABLE';
  end if;

  if not exists (
    select 1
    from public.business_owners bo
    where bo.business_id = p_business_id
      and bo.user_id = p_invited_by
      and bo.status = 'active'
  ) then
    raise exception using errcode = 'P0001', message = 'OWNER_ACCESS_DENIED';
  end if;

  if not exists (
    select 1
    from public.stores s
    where s.id = p_store_id
      and s.business_id = p_business_id
      and s.status = 'active'
      and s.deleted_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'STORE_NOT_AVAILABLE';
  end if;

  select r.id, r.name
  into v_role_id, v_role_name
  from public.roles r
  where r.code = lower(btrim(p_role_code))
    and r.business_id is null
    and r.code in (
      'manager', 'seller', 'cashier', 'accountant',
      'hairdresser', 'technician', 'receptionist'
    )
  limit 1;

  if v_role_id is null then
    raise exception using errcode = 'P0001', message = 'ROLE_NOT_AVAILABLE';
  end if;

  select a.code, a.capabilities
  into v_activity_code, v_capabilities
  from public.businesses b
  join public.activity_types a on a.id = b.activity_type_id
  where b.id = p_business_id;

  if not (
    p_role_code in ('manager', 'cashier', 'accountant')
    or (p_role_code = 'seller' and coalesce((v_capabilities ->> 'inventory')::boolean, false))
    or (p_role_code = 'hairdresser' and v_activity_code in ('hair_salon', 'beauty_institute'))
    or (p_role_code = 'technician' and v_activity_code in ('garage', 'service'))
    or (p_role_code = 'receptionist' and coalesce((v_capabilities ->> 'bookings')::boolean, false))
  ) then
    raise exception using errcode = 'P0001', message = 'ROLE_NOT_ALLOWED_FOR_ACTIVITY';
  end if;

  if exists (
    select 1 from public.users u
    where lower(u.email) = lower(btrim(p_email))
      and u.deleted_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'USER_ALREADY_EXISTS';
  end if;

  if exists (
    select 1 from public.employee_invitations ei
    where ei.business_id = p_business_id
      and lower(ei.email) = lower(btrim(p_email))
      and ei.status = 'pending'
      and ei.expires_at > now()
  ) then
    raise exception using errcode = 'P0001', message = 'INVITATION_ALREADY_PENDING';
  end if;

  select sp.limits
  into v_limits
  from public.business_subscriptions bs
  join public.subscription_plans sp on sp.id = bs.plan_id
  where bs.business_id = p_business_id
    and bs.status in ('trialing', 'active', 'past_due', 'paused')
  order by bs.created_at desc
  limit 1;

  if v_limits is null then
    raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_NOT_AVAILABLE';
  end if;

  v_employee_limit := nullif(v_limits ->> 'employees', '')::integer;
  if v_employee_limit is not null then
    select
      (select count(*) from public.employees e
       where e.business_id = p_business_id
         and e.is_active and e.deleted_at is null)
      +
      (select count(*) from public.employee_invitations ei
       where ei.business_id = p_business_id
         and ei.status = 'pending' and ei.expires_at > now())
    into v_used_seats;

    if v_used_seats >= v_employee_limit then
      raise exception using errcode = 'P0001', message = 'EMPLOYEE_LIMIT_REACHED';
    end if;
  end if;

  insert into public.employee_invitations (
    business_id, store_id, role_id, email, first_name, last_name,
    job_title, token_hash, status, invited_by, metadata
  )
  values (
    p_business_id, p_store_id, v_role_id, lower(btrim(p_email)),
    btrim(p_first_name), btrim(p_last_name),
    coalesce(nullif(btrim(p_job_title), ''), v_role_name),
    p_token_hash, 'pending', p_invited_by,
    jsonb_build_object('role_code', lower(btrim(p_role_code)))
  )
  returning id, expires_at into v_invitation_id, v_expires_at;

  return query select v_invitation_id, v_role_name, v_expires_at;
end;
$$;

create or replace function public.africrm_accept_employee_invitation(
  p_auth_user_id uuid,
  p_email text,
  p_token_hash text
)
returns table (
  profile_id uuid,
  employee_id uuid,
  business_id uuid,
  store_id uuid,
  role_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invitation public.employee_invitations%rowtype;
  v_profile_id uuid;
  v_employee_id uuid;
  v_metadata jsonb;
begin
  select ei.*
  into v_invitation
  from public.employee_invitations ei
  where ei.token_hash = p_token_hash
  for update;

  if v_invitation.id is null then
    raise exception using errcode = 'P0001', message = 'INVITATION_NOT_FOUND';
  end if;
  if v_invitation.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'INVITATION_NOT_PENDING';
  end if;
  if v_invitation.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'INVITATION_EXPIRED';
  end if;
  if lower(v_invitation.email) <> lower(btrim(p_email)) then
    raise exception using errcode = 'P0001', message = 'INVITATION_EMAIL_MISMATCH';
  end if;

  select u.id, u.metadata
  into v_profile_id, v_metadata
  from public.users u
  where u.auth_user_id = p_auth_user_id
  limit 1;

  v_metadata := coalesce(v_metadata, '{}'::jsonb) || jsonb_build_object(
    'account_type', 'employee',
    'invitation_id', v_invitation.id,
    'must_change_password', false
  );

  if v_profile_id is null then
    insert into public.users (
      auth_user_id, business_id, first_name, last_name,
      display_name, email, status, metadata
    )
    values (
      p_auth_user_id, v_invitation.business_id,
      coalesce(v_invitation.first_name, 'Employé'),
      coalesce(v_invitation.last_name, 'AFRICRM'),
      coalesce(
        nullif(concat_ws(' ', v_invitation.first_name, v_invitation.last_name), ''),
        lower(btrim(p_email))
      ),
      lower(btrim(p_email)), 'active', v_metadata
    )
    returning id into v_profile_id;
  else
    update public.users as u
    set
      business_id = coalesce(u.business_id, v_invitation.business_id),
      first_name = coalesce(v_invitation.first_name, u.first_name, 'Employé'),
      last_name = coalesce(v_invitation.last_name, u.last_name, 'AFRICRM'),
      display_name = coalesce(
        nullif(concat_ws(' ', v_invitation.first_name, v_invitation.last_name), ''),
        u.display_name,
        lower(btrim(p_email))
      ),
      email = lower(btrim(p_email)),
      status = 'active',
      metadata = v_metadata
    where u.id = v_profile_id;
  end if;

  select e.id into v_employee_id
  from public.employees e
  where e.business_id = v_invitation.business_id
    and e.user_id = v_profile_id
    and e.deleted_at is null
  limit 1;

  if v_employee_id is null then
    insert into public.employees (
      business_id, store_id, user_id, employee_number,
      first_name, last_name, email, job_title, is_active, metadata
    )
    values (
      v_invitation.business_id, v_invitation.store_id, v_profile_id,
      'EMP-' || upper(encode(gen_random_bytes(4), 'hex')),
      coalesce(v_invitation.first_name, 'Employé'),
      coalesce(v_invitation.last_name, 'AFRICRM'),
      lower(btrim(p_email)), v_invitation.job_title, true,
      jsonb_build_object('invitation_id', v_invitation.id)
    )
    returning id into v_employee_id;
  end if;

  insert into public.user_roles (
    user_id, role_id, business_id, store_id, assigned_by
  )
  values (
    v_profile_id, v_invitation.role_id, v_invitation.business_id,
    v_invitation.store_id, v_invitation.invited_by
  )
  on conflict do nothing;

  update public.employee_invitations as ei
  set status = 'accepted', accepted_by_user_id = v_profile_id, accepted_at = now()
  where ei.id = v_invitation.id and ei.status = 'pending';

  if not found then
    raise exception using errcode = 'P0001', message = 'INVITATION_NOT_PENDING';
  end if;

  insert into public.audit_logs (
    business_id, user_id, action, table_name, record_id, new_values
  )
  values (
    v_invitation.business_id, v_profile_id,
    'employee.invitation.accepted', 'employee_invitations', v_invitation.id,
    jsonb_build_object(
      'store_id', v_invitation.store_id,
      'role_id', v_invitation.role_id,
      'employee_id', v_employee_id
    )
  );

  return query
  select v_profile_id, v_employee_id, v_invitation.business_id,
    v_invitation.store_id, v_invitation.role_id;
end;
$$;

revoke all on function public.africrm_create_employee_invitation(
  uuid, uuid, text, text, text, text, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.africrm_create_employee_invitation(
  uuid, uuid, text, text, text, text, text, text, uuid
) to service_role;

revoke all on function public.africrm_accept_employee_invitation(
  uuid, text, text
) from public, anon, authenticated;
grant execute on function public.africrm_accept_employee_invitation(
  uuid, text, text
) to service_role;

comment on function public.africrm_create_employee_invitation(
  uuid, uuid, text, text, text, text, text, text, uuid
) is 'Crée une invitation employé après validation du tenant, du rôle et des limites d’abonnement.';

comment on function public.africrm_accept_employee_invitation(
  uuid, text, text
) is 'Accepte atomiquement une invitation et crée le profil, la fiche employé et son rôle contextualisé.';

commit;
