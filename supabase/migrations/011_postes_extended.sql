-- Section 2: extend postes with cost and scheduling limit fields
alter table public.postes
  add column if not exists hourly_cost numeric(10,2) default 0,
  add column if not exists max_hours_per_day numeric(4,1) default 0,
  add column if not exists max_hours_per_week numeric(5,1) default 0;
