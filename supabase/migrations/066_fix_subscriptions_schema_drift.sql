-- 066 — Fix subscriptions schema drift
--
-- Production had drifted from migration 036: the column was named
-- `trial_ends_at` and `cancel_at_period_end` / `user_id` were missing. Every
-- code path that selects `trial_end` / `cancel_at_period_end` (paywall gate in
-- the dashboard layout, Stripe webhook upserts, billing page, trial-reminder
-- cron) therefore failed silently — the subscription was read as null and the
-- paywall locked out paying managers 30 days after signup.
--
-- This migration realigns the table with 036. It is written idempotently so it
-- is a no-op on a fresh database created from 036 (which already has the right
-- shape) and a repair on a drifted one.

DO $$
BEGIN
  IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
          AND column_name = 'trial_ends_at'
      )
     AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'subscriptions'
          AND column_name = 'trial_end'
      )
  THEN
    ALTER TABLE public.subscriptions RENAME COLUMN trial_ends_at TO trial_end;
  END IF;
END $$;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
