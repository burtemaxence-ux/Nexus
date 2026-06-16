-- ============================================================
-- 051 — Performance indexes
-- ============================================================
-- current_establishment_id() runs on every RLS check; a covering index on
-- profiles avoids a heap fetch. The marketplace listing filters open slots by
-- establishment, which had no supporting index.
--
-- APPLY MANUALLY in the Supabase SQL Editor.
-- ============================================================

-- Covering index for current_establishment_id() (id is the PK; include the
-- establishment columns so the lookup is index-only).
CREATE INDEX IF NOT EXISTS idx_profiles_id_establishment
  ON public.profiles(id) INCLUDE (active_establishment_id, establishment_id);

-- Marketplace: list open slots for an establishment.
CREATE INDEX IF NOT EXISTS idx_marketplace_slots_establishment_status
  ON public.marketplace_slots(establishment_id, status);
