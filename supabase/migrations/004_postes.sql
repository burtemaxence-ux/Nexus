-- Table des postes
create table public.postes (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  color text not null default '#3B82F6',
  break_minutes integer not null default 0,
  created_at timestamptz default now()
);

alter table public.postes enable row level security;

create policy "Managers can manage postes"
  on public.postes for all
  using (public.is_manager());

create policy "Employees can view postes"
  on public.postes for select
  using (auth.uid() is not null);

-- Ajout colonnes sur shifts
alter table public.shifts
  add column if not exists poste_id uuid references public.postes(id) on delete set null,
  add column if not exists break_minutes integer not null default 0;

-- Ajout colonnes sur profiles
alter table public.profiles
  add column if not exists contract_type text
    check (contract_type in ('CDI 35h', 'CDI 28h', 'CDD', 'CDD Saisonnier', 'Extra')),
  add column if not exists weekly_hours numeric(4,1);
