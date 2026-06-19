-- ============================================================
-- 060 — AI usage per feature (separate plan vs chat counters)
-- ============================================================
-- The monthly AI quota (048) tracked a single counter per establishment.
-- The chat route had no monthly quota at all (only a 30/h rate limit), so a
-- chatty Essentiel customer was unbounded. We add a `feature` dimension so
-- planning generation and chat each get their own monthly counter, without
-- one cannibalising the other (sharing would have let 3 chat messages exhaust
-- the 3 planning credits).
--
-- APPLY MANUALLY in the Supabase SQL Editor.
-- ============================================================

-- ── Add the feature dimension (existing rows default to 'plan') ────────
ALTER TABLE public.ai_usage
  ADD COLUMN IF NOT EXISTS feature TEXT NOT NULL DEFAULT 'plan';

ALTER TABLE public.ai_usage DROP CONSTRAINT IF EXISTS ai_usage_pkey;
ALTER TABLE public.ai_usage
  ADD CONSTRAINT ai_usage_pkey PRIMARY KEY (establishment_id, period_month, feature);

-- ── Atomic consume, now dimensioned by feature ────────────────────────
-- p_feature defaults to 'plan' so the existing ai/plan call
-- (consume_ai_credit({ p_limit: 3 })) keeps working unchanged.
-- The old 1-arg function is dropped to avoid PostgREST overload ambiguity.
DROP FUNCTION IF EXISTS public.consume_ai_credit(INTEGER);
CREATE OR REPLACE FUNCTION public.consume_ai_credit(p_limit INTEGER, p_feature TEXT DEFAULT 'plan')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_est    UUID    := public.current_establishment_id();
  v_period TEXT    := to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM');
  v_used   INTEGER;
BEGIN
  IF v_est IS NULL OR NOT public.is_manager() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.ai_usage (establishment_id, period_month, feature, credits_used, updated_at)
  VALUES (v_est, v_period, p_feature, 1, now())
  ON CONFLICT (establishment_id, period_month, feature)
  DO UPDATE SET credits_used = public.ai_usage.credits_used + 1, updated_at = now()
  RETURNING credits_used INTO v_used;

  IF p_limit >= 0 AND v_used > p_limit THEN
    UPDATE public.ai_usage
       SET credits_used = credits_used - 1, updated_at = now()
     WHERE establishment_id = v_est AND period_month = v_period AND feature = p_feature;
    RETURN jsonb_build_object('allowed', false, 'used', p_limit, 'limit', p_limit);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'used', v_used, 'limit', p_limit);
END;
$$;

-- ── Read-only: current month usage for the caller, by feature ─────────
DROP FUNCTION IF EXISTS public.get_ai_usage();
CREATE OR REPLACE FUNCTION public.get_ai_usage(p_feature TEXT DEFAULT 'plan')
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT credits_used FROM public.ai_usage
      WHERE establishment_id = public.current_establishment_id()
        AND period_month = to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM')
        AND feature = p_feature),
    0
  )
$$;

-- ── Permissions (mirror migration 052: authenticated only) ────────────
REVOKE EXECUTE ON FUNCTION public.consume_ai_credit(INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_ai_usage(TEXT)              FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.consume_ai_credit(INTEGER, TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_ai_usage(TEXT)              TO authenticated;
