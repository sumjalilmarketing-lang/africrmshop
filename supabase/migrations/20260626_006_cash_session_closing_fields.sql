-- POS v14 — Champs de fermeture de session de caisse
-- Objectif : permettre une ouverture/fermeture de caisse professionnelle
-- sans supprimer ni réécrire les tables existantes.

alter table public.cash_sessions
  add column if not exists closing_balance numeric(14, 2),
  add column if not exists difference_amount numeric(14, 2) generated always as (
    case
      when closing_balance is null or expected_closing_balance is null then null
      else closing_balance - expected_closing_balance
    end
  ) stored,
  add column if not exists notes text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_cash_sessions_store_status
  on public.cash_sessions (store_id, status);

create index if not exists idx_cash_sessions_business_opened_at
  on public.cash_sessions (business_id, opened_at desc);

create index if not exists idx_cash_movements_session_created_at
  on public.cash_movements (cash_session_id, created_at desc);

create index if not exists idx_cash_movements_business_created_at
  on public.cash_movements (business_id, created_at desc);
