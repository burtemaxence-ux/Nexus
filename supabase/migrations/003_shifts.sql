-- Table des créneaux de travail
create table public.shifts (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  position text,
  notes text,
  status text default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.shifts enable row level security;

-- Le manager peut tout faire sur les créneaux
create policy "Managers can manage all shifts"
  on public.shifts for all
  using (public.is_manager());

-- L'employé peut voir ses propres créneaux
create policy "Employees can view own shifts"
  on public.shifts for select
  using (employee_id = auth.uid());
