-- 053_shift_exchanges_tenant_isolation.sql
-- Isolation multi-tenant des échanges de shifts.
-- AVANT: shift_exchanges n'avait pas d'establishment_id; les policies RLS
-- reposaient sur role + auth.uid() => un manager de l'établissement A pouvait
-- voir/valider les échanges de l'établissement B.
-- Apply via: supabase db push (ou SQL editor). Backfill puis NOT NULL.

alter table public.shift_exchanges
  add column if not exists establishment_id uuid references public.establishments(id) on delete cascade;

-- Backfill depuis l'établissement du shift lié (shift_id est on delete cascade,
-- donc tout échange a un shift valide).
update public.shift_exchanges se
set establishment_id = s.establishment_id
from public.shifts s
where se.shift_id = s.id and se.establishment_id is null;

alter table public.shift_exchanges alter column establishment_id set not null;

create index if not exists idx_shift_exchanges_establishment
  on public.shift_exchanges(establishment_id);

-- Auto-remplissage à l'insert, comme les autres tables tenant (cf. 020_multi_tenant).
drop trigger if exists set_establishment_id_shift_exchanges on public.shift_exchanges;
create trigger set_establishment_id_shift_exchanges
  before insert on public.shift_exchanges
  for each row execute function public.auto_set_establishment_id();

-- Remplace les policies rôle-uniquement par des policies scopées à l'établissement.
drop policy if exists "employees see relevant exchanges" on public.shift_exchanges;
drop policy if exists "employees create exchanges" on public.shift_exchanges;
drop policy if exists "employees and managers update exchanges" on public.shift_exchanges;

create policy "exchanges_select_scoped"
  on public.shift_exchanges for select
  using (
    establishment_id = current_establishment_id()
    and (
      status = 'open'
      or auth.uid() = proposer_id
      or auth.uid() = acceptor_id
      or is_manager()
    )
  );

create policy "exchanges_insert_scoped"
  on public.shift_exchanges for insert
  with check (
    establishment_id = current_establishment_id()
    and auth.uid() = proposer_id
  );

create policy "exchanges_update_scoped"
  on public.shift_exchanges for update
  using (
    establishment_id = current_establishment_id()
    and (
      auth.uid() = proposer_id
      or auth.uid() = acceptor_id
      or is_manager()
    )
  );
