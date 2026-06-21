-- 067 — Champs administratifs employé (dossier RH complet)
--
-- Complète la fiche employé avec les données admin standards des apps RH
-- (état civil, coordonnées, contact d'urgence, paie). RLS héritée de la
-- table profiles (managers de l'établissement uniquement).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date               date,
  ADD COLUMN IF NOT EXISTS address                  text,
  ADD COLUMN IF NOT EXISTS social_security_number   text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name   text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone  text,
  ADD COLUMN IF NOT EXISTS iban                     text,
  ADD COLUMN IF NOT EXISTS nationality              text,
  ADD COLUMN IF NOT EXISTS work_permit_expiry       date,
  ADD COLUMN IF NOT EXISTS matricule                text;
