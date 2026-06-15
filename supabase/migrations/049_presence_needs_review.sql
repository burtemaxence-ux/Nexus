-- ============================================================
-- 049 — Flag anomalous presences for manager review
-- ============================================================
-- A forgotten clock-out closed the next day produces an aberrant duration.
-- Rather than silently recording a 20h shift (which pollutes hours and
-- compliance), the clock-out flags the presence for manager review.
--
-- APPLY MANUALLY in the Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.presences
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT FALSE;
