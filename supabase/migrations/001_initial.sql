-- Extension pour UUID
create extension if not exists "uuid-ossp";

-- Table des profils utilisateurs (liée à auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null check (role in ('manager', 'employee')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS (Row Level Security)
alter table public.profiles enable row level security;

-- Un utilisateur peut lire son propre profil
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Un utilisateur peut mettre à jour son propre profil
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Un manager peut voir tous les profils
create policy "Managers can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- Trigger pour créer automatiquement un profil à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
