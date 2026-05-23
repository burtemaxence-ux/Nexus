-- New columns on profiles
alter table public.profiles
  add column if not exists phone text,
  add column if not exists pay_ref text,
  add column if not exists pin varchar(4),
  add column if not exists disability boolean not null default false,
  add column if not exists archived boolean not null default false,
  add column if not exists invited_by uuid references public.profiles(id) on delete set null;

-- Contracts history table
create table if not exists public.contracts (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('CDI 35h', 'CDI 28h', 'CDD', 'CDD Saisonnier', 'Extra')),
  start_date date not null,
  end_date date,
  weekly_hours numeric not null,
  hourly_rate numeric,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.contracts enable row level security;

create policy "Managers can manage contracts"
  on public.contracts for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'manager')
  );

create policy "Employees can view own contracts"
  on public.contracts for select
  using (employee_id = auth.uid());

-- Availabilities table (one row per employee per day)
create table if not exists public.availabilities (
  id uuid default uuid_generate_v4() primary key,
  employee_id uuid references public.profiles(id) on delete cascade not null,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=Monday … 6=Sunday
  start_time time not null default '09:00',
  end_time time not null default '17:00',
  created_at timestamptz default now(),
  unique(employee_id, day_of_week)
);

alter table public.availabilities enable row level security;

create policy "Managers can manage availabilities"
  on public.availabilities for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'manager')
  );

create policy "Employees can manage own availabilities"
  on public.availabilities for all
  using (employee_id = auth.uid());
