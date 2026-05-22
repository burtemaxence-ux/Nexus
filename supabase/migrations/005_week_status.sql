create table public.week_status (
  week_monday date primary key,
  published boolean not null default false,
  locked boolean not null default false,
  published_at timestamptz,
  locked_at timestamptz
);

alter table public.week_status enable row level security;

create policy "Managers can manage week_status"
  on public.week_status for all
  using (public.is_manager());

create policy "Employees can view week_status"
  on public.week_status for select
  using (auth.uid() is not null);
