-- ============================================================
-- 079 — profiles.calendar_token_version
-- ============================================================
-- MIGRATION DE RATTRAPAGE (audit C4). Appliquée en production le 2026-07-06
-- (supabase_migrations.schema_migrations, version 20260706205626) mais jamais
-- committée dans le dépôt. Définition relevée en prod via
-- information_schema.columns : integer NOT NULL DEFAULT 1.
--
-- Sert à invalider les URLs de flux calendrier (ICS) d'un employé : incrémenter
-- la version révoque les liens déjà distribués.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS calendar_token_version integer NOT NULL DEFAULT 1;
