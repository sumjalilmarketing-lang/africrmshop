-- AFRICRM Shop
-- Migration 001 : fondations Owner / Business / Store / Employees / Subscriptions
-- Date : 2026-06-20
--
-- Cette migration est additive :
-- - aucune table existante n'est supprimée ;
-- - businesses, stores, users, employees, roles, permissions et user_roles sont réutilisées ;
-- - owner_profiles n'est pas créée car public.users porte déjà le profil ;
-- - store_users n'est pas créée car public.user_roles.store_id porte déjà l'accès magasin.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Types complémentaires
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'business_owner_status'
  ) then
    create type public.business_owner_status as enum (
      'invited',
      'active',
      'revoked'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'employee_invitation_status'
  ) then
    create type public.employee_invitation_status as enum (
      'pending',
      'accepted',
      'expired',
      'revoked'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'subscription_status'
  ) then
    create type public.subscription_status as enum (
      'trialing',
      'active',
      'past_due',
      'paused',
      'cancelled',
      'expired'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'billing_interval'
  ) then
    create type public.billing_interval as enum ('monthly', 'yearly', 'custom');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 2. Types d'activité
-- -----------------------------------------------------------------------------

create table if not exists public.activity_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  capabilities jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_types_code_format_check
    check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint activity_types_capabilities_object_check
    check (jsonb_typeof(capabilities) = 'object')
);

insert into public.activity_types (
  code,
  name,
  description,
  capabilities,
  sort_order
)
values
  (
    'boutique',
    'Boutique',
    'Commerce de détail avec caisse et stock',
    '{"pos":true,"inventory":true,"bookings":false,"services":false}'::jsonb,
    10
  ),
  (
    'hair_salon',
    'Salon de coiffure',
    'Prestations, agenda, rendez-vous et encaissement',
    '{"pos":true,"inventory":true,"bookings":true,"services":true}'::jsonb,
    20
  ),
  (
    'beauty_institute',
    'Institut de beauté',
    'Prestations de beauté, agenda et vente de produits',
    '{"pos":true,"inventory":true,"bookings":true,"services":true}'::jsonb,
    30
  ),
  (
    'restaurant',
    'Restaurant',
    'Encaissement, catalogue et gestion opérationnelle',
    '{"pos":true,"inventory":true,"bookings":false,"services":false}'::jsonb,
    40
  ),
  (
    'garage',
    'Garage',
    'Prestations techniques, rendez-vous, pièces et paiements',
    '{"pos":true,"inventory":true,"bookings":true,"services":true}'::jsonb,
    50
  ),
  (
    'pharmacy',
    'Pharmacie',
    'Caisse, produits et suivi de stock',
    '{"pos":true,"inventory":true,"bookings":false,"services":false}'::jsonb,
    60
  ),
  (
    'service',
    'Entreprise de services',
    'Prestations, agenda, rendez-vous et paiements',
    '{"pos":true,"inventory":false,"bookings":true,"services":true}'::jsonb,
    70
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  capabilities = excluded.capabilities,
  sort_order = excluded.sort_order,
  is_active = true;

alter table public.businesses
  add column if not exists activity_type_id uuid
    references public.activity_types(id) on delete restrict,
  add column if not exists onboarding_status text not null default 'not_started',
  add column if not exists onboarding_completed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_onboarding_status_check'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
      add constraint businesses_onboarding_status_check
      check (
        onboarding_status in (
          'not_started',
          'business_created',
          'store_created',
          'team_invited',
          'completed'
        )
      );
  end if;
end
$$;

create index if not exists businesses_activity_type_idx
  on public.businesses(activity_type_id)
  where deleted_at is null;

-- Reprise non destructive si un ancien enregistrement possède déjà un code
-- d'activité dans metadata.activity_type.
update public.businesses b
set activity_type_id = a.id
from public.activity_types a
where b.activity_type_id is null
  and b.metadata ->> 'activity_type' = a.code;

-- -----------------------------------------------------------------------------
-- 3. Propriétaires d'entreprises
-- -----------------------------------------------------------------------------

create table if not exists public.business_owners (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  user_id uuid not null
    references public.users(id) on delete cascade,
  status public.business_owner_status not null default 'active',
  is_primary boolean not null default false,
  invited_by uuid references public.users(id) on delete set null,
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_owners_business_user_key unique (business_id, user_id)
);

create unique index if not exists business_owners_one_primary_idx
  on public.business_owners(business_id)
  where is_primary and status = 'active';

create index if not exists business_owners_user_idx
  on public.business_owners(user_id, status);

-- Reprise des propriétaires déjà représentés par user_roles.
insert into public.business_owners (
  business_id,
  user_id,
  status,
  is_primary,
  accepted_at
)
select
  ur.business_id,
  ur.user_id,
  'active'::public.business_owner_status,
  not exists (
    select 1
    from public.business_owners existing
    where existing.business_id = ur.business_id
      and existing.is_primary
      and existing.status = 'active'
  ),
  now()
from public.user_roles ur
join public.roles r on r.id = ur.role_id
where r.code = 'owner'
  and ur.business_id is not null
on conflict (business_id, user_id) do nothing;

-- -----------------------------------------------------------------------------
-- 4. Invitations d'employés
-- -----------------------------------------------------------------------------

create table if not exists public.employee_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  email text not null,
  first_name text,
  last_name text,
  job_title text,
  token_hash text not null unique,
  status public.employee_invitation_status not null default 'pending',
  invited_by uuid not null references public.users(id) on delete restrict,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by_user_id uuid references public.users(id) on delete set null,
  accepted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_invitations_email_check
    check (email = lower(btrim(email)) and position('@' in email) > 1),
  constraint employee_invitations_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint employee_invitations_acceptance_check
    check (
      (status = 'accepted' and accepted_at is not null and accepted_by_user_id is not null)
      or status <> 'accepted'
    )
);

create index if not exists employee_invitations_business_idx
  on public.employee_invitations(business_id, status, created_at desc);

create index if not exists employee_invitations_email_idx
  on public.employee_invitations(lower(email), status);

create unique index if not exists employee_invitations_one_pending_idx
  on public.employee_invitations(business_id, lower(email), role_id)
  where status = 'pending';

-- Garantit que le magasin d'une invitation appartient à la même entreprise.
create or replace function public.africrm_validate_invitation_store()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.store_id is not null and not exists (
    select 1
    from public.stores s
    where s.id = new.store_id
      and s.business_id = new.business_id
      and s.deleted_at is null
  ) then
    raise exception 'Le magasin de l''invitation n''appartient pas à l''entreprise.';
  end if;

  return new;
end;
$$;

drop trigger if exists employee_invitations_validate_store
  on public.employee_invitations;
create trigger employee_invitations_validate_store
before insert or update of business_id, store_id
on public.employee_invitations
for each row execute function public.africrm_validate_invitation_store();

-- -----------------------------------------------------------------------------
-- 5. Abonnements SaaS
-- -----------------------------------------------------------------------------

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price_monthly numeric(14,2),
  price_yearly numeric(14,2),
  currency_code char(3) not null default 'XOF',
  limits jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_plans_code_format_check
    check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint subscription_plans_monthly_price_check
    check (price_monthly is null or price_monthly >= 0),
  constraint subscription_plans_yearly_price_check
    check (price_yearly is null or price_yearly >= 0),
  constraint subscription_plans_limits_object_check
    check (jsonb_typeof(limits) = 'object'),
  constraint subscription_plans_features_object_check
    check (jsonb_typeof(features) = 'object')
);

insert into public.subscription_plans (
  code,
  name,
  description,
  limits,
  features,
  sort_order
)
values
  (
    'essential',
    'Essentiel',
    'Pour une petite boutique ou une activité qui démarre',
    '{"stores":1,"employees":3}'::jsonb,
    '{"pos":true,"inventory":true,"crm":true,"bookings":false,"accounting":false}'::jsonb,
    10
  ),
  (
    'business',
    'Business',
    'Pour une PME avec plusieurs collaborateurs',
    '{"stores":3,"employees":15}'::jsonb,
    '{"pos":true,"inventory":true,"crm":true,"bookings":true,"accounting":true}'::jsonb,
    20
  ),
  (
    'enterprise',
    'Enterprise',
    'Pour les réseaux multi-sites et besoins avancés',
    '{"stores":null,"employees":null}'::jsonb,
    '{"pos":true,"inventory":true,"crm":true,"bookings":true,"accounting":true,"advanced_security":true}'::jsonb,
    30
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  limits = excluded.limits,
  features = excluded.features,
  sort_order = excluded.sort_order;

create table if not exists public.business_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  plan_id uuid not null
    references public.subscription_plans(id) on delete restrict,
  status public.subscription_status not null default 'trialing',
  billing_interval public.billing_interval not null default 'monthly',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_subscriptions_period_check
    check (
      current_period_end is null
      or current_period_start is null
      or current_period_end > current_period_start
    ),
  constraint business_subscriptions_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists business_subscriptions_current_idx
  on public.business_subscriptions(business_id)
  where status in ('trialing', 'active', 'past_due', 'paused');

create index if not exists business_subscriptions_plan_status_idx
  on public.business_subscriptions(plan_id, status);

create unique index if not exists business_subscriptions_provider_ref_idx
  on public.business_subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;

-- Reprise des abonnements historiques stockés dans businesses.metadata.
insert into public.business_subscriptions (
  business_id,
  plan_id,
  status,
  trial_ends_at,
  metadata
)
select
  b.id,
  p.id,
  case
    when b.status = 'trial' then 'trialing'::public.subscription_status
    when b.status = 'active' then 'active'::public.subscription_status
    when b.status = 'suspended' then 'paused'::public.subscription_status
    else 'expired'::public.subscription_status
  end,
  b.trial_ends_at,
  jsonb_build_object('migrated_from_business_metadata', true)
from public.businesses b
join public.subscription_plans p
  on lower(p.name) = lower(coalesce(b.metadata ->> 'subscription_plan', ''))
where not exists (
  select 1
  from public.business_subscriptions existing
  where existing.business_id = b.id
    and existing.status in ('trialing', 'active', 'past_due', 'paused')
);

-- -----------------------------------------------------------------------------
-- 6. Rôles et permissions complémentaires
-- -----------------------------------------------------------------------------

insert into public.roles (name, code, description, is_system)
select seed.name, seed.code, seed.description, true
from (
  values
    ('Vendeur', 'seller', 'Ventes, clients et consultation du stock'),
    ('Coiffeur', 'hairdresser', 'Prestations et agenda personnel'),
    ('Technicien', 'technician', 'Interventions, services et agenda'),
    ('Réceptionniste', 'receptionist', 'Accueil, rendez-vous et paiements')
) as seed(name, code, description)
where not exists (
  select 1
  from public.roles r
  where r.business_id is null and r.code = seed.code
);

insert into public.permissions (code, name, description)
values
  ('dashboard.view', 'Voir le dashboard', 'Consulter le dashboard autorisé'),
  ('pos.access', 'Accéder au POS', 'Utiliser la caisse et encaisser'),
  ('bookings.access', 'Accéder à l''agenda', 'Consulter son agenda et ses rendez-vous'),
  ('inventory.view', 'Consulter le stock', 'Voir les produits et disponibilités'),
  ('accounting.view', 'Consulter la comptabilité', 'Voir les états comptables autorisés'),
  ('stores.manage', 'Gérer les boutiques', 'Créer et configurer les points de vente'),
  ('employees.manage', 'Gérer les employés', 'Inviter et administrer les employés'),
  ('subscriptions.view', 'Voir l''abonnement', 'Consulter l''offre et les limites'),
  ('subscriptions.manage', 'Gérer les abonnements', 'Administrer les abonnements plateforme')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;

-- Owner : toutes les permissions métier, y compris celles ajoutées plus tard.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.business_id is null and r.code = 'owner'
on conflict do nothing;

-- Super Admin : supervision plateforme et toutes les permissions actuelles.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.business_id is null and r.code = 'super_admin'
on conflict do nothing;

-- Permissions opérationnelles par rôle.
with mappings(role_code, permission_code) as (
  values
    ('manager', 'dashboard.view'),
    ('manager', 'business.manage'),
    ('manager', 'users.manage'),
    ('manager', 'stores.manage'),
    ('manager', 'employees.manage'),
    ('manager', 'inventory.manage'),
    ('manager', 'sales.manage'),
    ('manager', 'payments.manage'),
    ('manager', 'cash.manage'),
    ('manager', 'crm.manage'),
    ('manager', 'bookings.manage'),
    ('manager', 'communications.manage'),
    ('manager', 'pos.access'),
    ('manager', 'bookings.access'),
    ('seller', 'dashboard.view'),
    ('seller', 'pos.access'),
    ('seller', 'sales.manage'),
    ('seller', 'payments.manage'),
    ('seller', 'crm.manage'),
    ('seller', 'inventory.view'),
    ('cashier', 'dashboard.view'),
    ('cashier', 'pos.access'),
    ('cashier', 'sales.manage'),
    ('cashier', 'payments.manage'),
    ('cashier', 'cash.manage'),
    ('accountant', 'dashboard.view'),
    ('accountant', 'accounting.view'),
    ('accountant', 'accounting.manage'),
    ('accountant', 'tax.manage'),
    ('hairdresser', 'dashboard.view'),
    ('hairdresser', 'bookings.access'),
    ('hairdresser', 'bookings.manage'),
    ('hairdresser', 'crm.manage'),
    ('hairdresser', 'payments.manage'),
    ('technician', 'dashboard.view'),
    ('technician', 'bookings.access'),
    ('technician', 'bookings.manage'),
    ('technician', 'crm.manage'),
    ('technician', 'inventory.view'),
    ('receptionist', 'dashboard.view'),
    ('receptionist', 'bookings.access'),
    ('receptionist', 'bookings.manage'),
    ('receptionist', 'crm.manage'),
    ('receptionist', 'payments.manage')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from mappings m
join public.roles r
  on r.business_id is null and r.code = m.role_code
join public.permissions p on p.code = m.permission_code
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 7. updated_at automatique pour les nouvelles tables
-- -----------------------------------------------------------------------------

create or replace function public.africrm_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists activity_types_touch_updated_at on public.activity_types;
create trigger activity_types_touch_updated_at
before update on public.activity_types
for each row execute function public.africrm_touch_updated_at();

drop trigger if exists business_owners_touch_updated_at on public.business_owners;
create trigger business_owners_touch_updated_at
before update on public.business_owners
for each row execute function public.africrm_touch_updated_at();

drop trigger if exists employee_invitations_touch_updated_at
  on public.employee_invitations;
create trigger employee_invitations_touch_updated_at
before update on public.employee_invitations
for each row execute function public.africrm_touch_updated_at();

drop trigger if exists subscription_plans_touch_updated_at
  on public.subscription_plans;
create trigger subscription_plans_touch_updated_at
before update on public.subscription_plans
for each row execute function public.africrm_touch_updated_at();

drop trigger if exists business_subscriptions_touch_updated_at
  on public.business_subscriptions;
create trigger business_subscriptions_touch_updated_at
before update on public.business_subscriptions
for each row execute function public.africrm_touch_updated_at();

-- -----------------------------------------------------------------------------
-- 8. Fonctions d'autorisation multi-tenant
-- -----------------------------------------------------------------------------

create or replace function public.africrm_current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select u.id
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.status = 'active'
    and u.deleted_at is null
  limit 1;
$$;

create or replace function public.africrm_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.users u
    join public.user_roles ur on ur.user_id = u.id
    join public.roles r on r.id = ur.role_id
    where u.auth_user_id = auth.uid()
      and u.status = 'active'
      and u.deleted_at is null
      and r.code = 'super_admin'
  );
$$;

create or replace function public.africrm_has_business_role(
  target_business_id uuid,
  accepted_role_codes text[]
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.africrm_is_super_admin() or exists (
    select 1
    from public.users u
    join public.user_roles ur on ur.user_id = u.id
    join public.roles r on r.id = ur.role_id
    where u.auth_user_id = auth.uid()
      and u.status = 'active'
      and u.deleted_at is null
      and ur.business_id = target_business_id
      and r.code = any(accepted_role_codes)
  );
$$;

create or replace function public.africrm_has_business_access(
  target_business_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.africrm_is_super_admin()
    or exists (
      select 1
      from public.business_owners bo
      join public.users u on u.id = bo.user_id
      where u.auth_user_id = auth.uid()
        and u.status = 'active'
        and u.deleted_at is null
        and bo.business_id = target_business_id
        and bo.status = 'active'
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.users u on u.id = ur.user_id
      where u.auth_user_id = auth.uid()
        and u.status = 'active'
        and u.deleted_at is null
        and ur.business_id = target_business_id
    );
$$;

create or replace function public.africrm_has_store_access(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.stores s
    where s.id = target_store_id
      and s.deleted_at is null
      and (
        public.africrm_is_super_admin()
        or exists (
          select 1
          from public.business_owners bo
          join public.users u on u.id = bo.user_id
          where u.auth_user_id = auth.uid()
            and u.status = 'active'
            and u.deleted_at is null
            and bo.business_id = s.business_id
            and bo.status = 'active'
        )
        or exists (
          select 1
          from public.user_roles ur
          join public.users u on u.id = ur.user_id
          where u.auth_user_id = auth.uid()
            and u.status = 'active'
            and u.deleted_at is null
            and ur.business_id = s.business_id
            and (ur.store_id is null or ur.store_id = s.id)
        )
      )
  );
$$;

revoke all on function public.africrm_current_user_id() from public;
revoke all on function public.africrm_is_super_admin() from public;
revoke all on function public.africrm_has_business_role(uuid, text[]) from public;
revoke all on function public.africrm_has_business_access(uuid) from public;
revoke all on function public.africrm_has_store_access(uuid) from public;

grant execute on function public.africrm_current_user_id() to authenticated, service_role;
grant execute on function public.africrm_is_super_admin() to authenticated, service_role;
grant execute on function public.africrm_has_business_role(uuid, text[])
  to authenticated, service_role;
grant execute on function public.africrm_has_business_access(uuid)
  to authenticated, service_role;
grant execute on function public.africrm_has_store_access(uuid)
  to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 9. RLS des nouvelles tables uniquement
-- Les policies existantes des anciennes tables ne sont ni supprimées ni remplacées.
-- -----------------------------------------------------------------------------

alter table public.activity_types enable row level security;
alter table public.business_owners enable row level security;
alter table public.employee_invitations enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.business_subscriptions enable row level security;

grant select on public.activity_types to anon, authenticated;
grant select on public.subscription_plans to anon, authenticated;
grant insert, update, delete on public.activity_types to authenticated;
grant insert, update, delete on public.subscription_plans to authenticated;
grant select, insert, update, delete on public.business_owners to authenticated;
grant select, insert, update, delete on public.employee_invitations to authenticated;
grant select, insert, update, delete on public.business_subscriptions to authenticated;
grant select, insert, update, delete on public.activity_types to service_role;
grant select, insert, update, delete on public.business_owners to service_role;
grant select, insert, update, delete on public.employee_invitations to service_role;
grant select, insert, update, delete on public.subscription_plans to service_role;
grant select, insert, update, delete on public.business_subscriptions to service_role;

drop policy if exists activity_types_active_read on public.activity_types;
create policy activity_types_active_read
on public.activity_types
for select
to anon, authenticated
using (is_active);

drop policy if exists activity_types_super_admin_read on public.activity_types;
create policy activity_types_super_admin_read
on public.activity_types
for select
to authenticated
using (public.africrm_is_super_admin());

drop policy if exists activity_types_super_admin_write on public.activity_types;
create policy activity_types_super_admin_write
on public.activity_types
for all
to authenticated
using (public.africrm_is_super_admin())
with check (public.africrm_is_super_admin());

drop policy if exists business_owners_read on public.business_owners;
create policy business_owners_read
on public.business_owners
for select
to authenticated
using (
  public.africrm_is_super_admin()
  or user_id = public.africrm_current_user_id()
  or public.africrm_has_business_access(business_id)
);

drop policy if exists business_owners_super_admin_write on public.business_owners;
create policy business_owners_super_admin_write
on public.business_owners
for all
to authenticated
using (public.africrm_is_super_admin())
with check (public.africrm_is_super_admin());

drop policy if exists employee_invitations_team_read
  on public.employee_invitations;
create policy employee_invitations_team_read
on public.employee_invitations
for select
to authenticated
using (
  public.africrm_has_business_role(
    business_id,
    array['owner', 'manager']::text[]
  )
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists employee_invitations_team_insert
  on public.employee_invitations;
create policy employee_invitations_team_insert
on public.employee_invitations
for insert
to authenticated
with check (
  public.africrm_has_business_role(
    business_id,
    array['owner', 'manager']::text[]
  )
  and invited_by = public.africrm_current_user_id()
);

drop policy if exists employee_invitations_team_update
  on public.employee_invitations;
create policy employee_invitations_team_update
on public.employee_invitations
for update
to authenticated
using (
  public.africrm_has_business_role(
    business_id,
    array['owner', 'manager']::text[]
  )
)
with check (
  public.africrm_has_business_role(
    business_id,
    array['owner', 'manager']::text[]
  )
);

drop policy if exists employee_invitations_team_delete
  on public.employee_invitations;
create policy employee_invitations_team_delete
on public.employee_invitations
for delete
to authenticated
using (
  public.africrm_has_business_role(
    business_id,
    array['owner', 'manager']::text[]
  )
);

drop policy if exists subscription_plans_active_read on public.subscription_plans;
create policy subscription_plans_active_read
on public.subscription_plans
for select
to anon, authenticated
using (is_active);

drop policy if exists subscription_plans_super_admin_read
  on public.subscription_plans;
create policy subscription_plans_super_admin_read
on public.subscription_plans
for select
to authenticated
using (public.africrm_is_super_admin());

drop policy if exists subscription_plans_super_admin_write
  on public.subscription_plans;
create policy subscription_plans_super_admin_write
on public.subscription_plans
for all
to authenticated
using (public.africrm_is_super_admin())
with check (public.africrm_is_super_admin());

drop policy if exists business_subscriptions_read
  on public.business_subscriptions;
create policy business_subscriptions_read
on public.business_subscriptions
for select
to authenticated
using (public.africrm_has_business_access(business_id));

drop policy if exists business_subscriptions_super_admin_write
  on public.business_subscriptions;
create policy business_subscriptions_super_admin_write
on public.business_subscriptions
for all
to authenticated
using (public.africrm_is_super_admin())
with check (public.africrm_is_super_admin());

-- -----------------------------------------------------------------------------
-- 10. Commentaires de schéma
-- -----------------------------------------------------------------------------

comment on table public.activity_types is
  'Types d’activités AFRICRM Shop et modules fonctionnels disponibles.';
comment on table public.business_owners is
  'Relation plusieurs-à-plusieurs entre propriétaires et entreprises.';
comment on table public.employee_invitations is
  'Invitations sécurisées d’employés ; seul le hash du jeton est conservé.';
comment on table public.subscription_plans is
  'Catalogue des offres SaaS AFRICRM Shop.';
comment on table public.business_subscriptions is
  'Historique et abonnement courant de chaque entreprise.';
comment on column public.businesses.activity_type_id is
  'Type d’activité déterminant les modules POS, stock, services et booking.';

commit;

-- Vérifications facultatives après exécution :
-- select code, name, capabilities from public.activity_types order by sort_order;
-- select code, name from public.roles order by code;
-- select code, name from public.permissions order by code;
-- select code, name, limits, features from public.subscription_plans order by sort_order;
-- select tablename, policyname from pg_policies
-- where schemaname = 'public'
--   and tablename in (
--     'activity_types',
--     'business_owners',
--     'employee_invitations',
--     'subscription_plans',
--     'business_subscriptions'
--   )
-- order by tablename, policyname;
