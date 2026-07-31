-- ============================================================
-- 090 — profiles.invited_by (rattrapage d'une dérive de production)
-- ============================================================
-- Créée par 010 dans le dépôt, jamais appliquée en production — dérive relevée
-- en Phase 0. Conséquence observée : /api/employees/invite construit un UPDATE
-- d'enrichissement contenant `invited_by`, et Postgres rejette l'instruction
-- ENTIÈRE quand la colonne n'existe pas. Le code ne vérifiait pas l'erreur, si
-- bien que `first_name`, `last_name`, `position`, `phone`, `contract_type` et
-- `weekly_hours` n'étaient jamais écrits — pour une API répondant 200 OK.
--
-- Migration séparée de 091 VOLONTAIREMENT, et à appliquer AVANT elle :
-- purement additive, elle répare le bug tout de suite sans dépendre d'aucun
-- déploiement applicatif. 091 change le trigger et ne doit être appliquée
-- qu'une fois la nouvelle version de la route en ligne (voir son en-tête).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
