-- 068 — Chiffre d'affaires journalier
--
-- Permet de saisir le CA par jour et d'en déduire le ratio coût main
-- d'œuvre / CA (productivité), métrique clé en resto/retail.
-- RLS : managers de l'établissement uniquement.

create table if not exists public.revenues (
  id               uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  date             date not null,
  amount           numeric(12,2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (establishment_id, date)
);

alter table public.revenues enable row level security;

create policy "revenues_manage" on public.revenues
  for all
  using  (establishment_id = public.current_establishment_id() and public.is_manager())
  with check (establishment_id = public.current_establishment_id() and public.is_manager());
