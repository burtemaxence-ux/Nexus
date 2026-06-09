-- Migration 038 : ajout colonne is_active sur establishments
-- Requis pour les crons compliance-check, weekly-brief-manager, weekly-summary-employee

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Index pour les requêtes de filtrage par statut
CREATE INDEX IF NOT EXISTS idx_establishments_is_active
  ON public.establishments(is_active)
  WHERE is_active = true;
