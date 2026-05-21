-- Ajout du poste au profil
alter table public.profiles add column if not exists position text;

-- Le manager peut voir tous les profils (update pour couvrir l'insertion aussi)
create policy "Managers can insert profiles"
  on public.profiles for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );
