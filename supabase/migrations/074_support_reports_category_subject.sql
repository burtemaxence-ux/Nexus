-- 074 — Support reports : motif (category) + sujet (subject)
-- La page /manager/support envoie désormais un motif et un sujet en plus du
-- message. On les stocke en colonnes dédiées (nullables) plutôt que composés
-- dans `message`, pour permettre le tri/filtrage côté back-office opérateur.
-- Rétro-compatible : le bouton flottant « Signaler un problème » n'envoie
-- toujours que `message`, les deux colonnes restent alors NULL.

ALTER TABLE public.support_reports
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS subject  TEXT;
