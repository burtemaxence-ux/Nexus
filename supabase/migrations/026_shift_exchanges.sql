-- Shift exchange requests (employee ↔ employee, validated by manager)
create table if not exists public.shift_exchanges (
  id            uuid primary key default gen_random_uuid(),
  shift_id      uuid not null references public.shifts(id) on delete cascade,
  proposer_id   uuid not null references public.profiles(id) on delete cascade,
  acceptor_id   uuid references public.profiles(id) on delete set null,
  status        text not null default 'open'
                check (status in ('open','pending_approval','approved','rejected','cancelled')),
  proposer_note text,
  manager_note  text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.shift_exchanges enable row level security;

-- Employees see open exchanges from anyone, plus exchanges they're part of
create policy "employees see relevant exchanges"
  on public.shift_exchanges for select
  using (
    status = 'open'
    or auth.uid() = proposer_id
    or auth.uid() = acceptor_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('manager','supervisor')
    )
  );

create policy "employees create exchanges"
  on public.shift_exchanges for insert
  with check (auth.uid() = proposer_id);

create policy "employees and managers update exchanges"
  on public.shift_exchanges for update
  using (
    auth.uid() = proposer_id
    or auth.uid() = acceptor_id
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('manager','supervisor')
    )
  );
