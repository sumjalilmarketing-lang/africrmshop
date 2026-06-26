-- AFRICRM Shop
-- Migration 004 : correction acceptation invitation employé
-- Date : 2026-06-26
-- Migration additive : aucune table supprimée, aucune architecture modifiée.
-- Objectif : remplacer gen_random_bytes par gen_random_uuid pour générer employee_number.

begin;

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
      'EMP-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 8)),
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

revoke all on function public.africrm_accept_employee_invitation(
  uuid, text, text
) from public, anon, authenticated;

grant execute on function public.africrm_accept_employee_invitation(
  uuid, text, text
) to service_role;

comment on function public.africrm_accept_employee_invitation(
  uuid, text, text
) is 'Accepte atomiquement une invitation et crée le profil, la fiche employé et son rôle contextualisé. Génère employee_number via gen_random_uuid.';

commit;
