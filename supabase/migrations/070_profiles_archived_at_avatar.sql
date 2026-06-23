-- 070 — Date de départ (turnover) + photo de profil
--
-- archived_at : horodatage de l'archivage, nécessaire pour calculer le taux
-- de départ / turnover sur une période.
-- avatar_url  : photo de profil de l'employé (bucket Storage "avatars").

alter table public.profiles
  add column if not exists archived_at timestamptz,
  add column if not exists avatar_url  text;

-- Renseigne archived_at pour les employés déjà archivés (best-effort).
update public.profiles
set archived_at = coalesce(updated_at, now())
where archived = true and archived_at is null;
