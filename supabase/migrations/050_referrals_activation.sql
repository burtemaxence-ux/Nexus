-- ============================================================
-- 050 — Referral program: real discount delivery support
-- ============================================================
-- Adds tracking for the filleul "first month free" grant and an index to
-- look up a referral by the referred user (churn sync from the webhook).
--
-- APPLY MANUALLY in the Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS first_month_granted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_referrals_referred
  ON public.referrals(referred_id)
  WHERE referred_id IS NOT NULL;
