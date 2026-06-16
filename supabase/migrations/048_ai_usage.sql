-- ============================================================
-- 048 — AI usage quota (DB-backed, authoritative)
-- ============================================================
-- Replaces the KV/in-memory monthly AI quota, which was non-persistent
-- across serverless instances (quota bypassable) and read with an
-- inconsistent format. Postgres is always available and authoritative.
--
-- APPLY MANUALLY in the Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_usage (
  establishment_id UUID        NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  period_month     TEXT        NOT NULL,            -- 'YYYY-MM' (UTC)
  credits_used     INTEGER     NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (establishment_id, period_month)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Managers can read their own establishment usage. Writes only go through
-- the SECURITY DEFINER function below (no INSERT/UPDATE policy = blocked).
DROP POLICY IF EXISTS "ai_usage_read_own" ON public.ai_usage;
CREATE POLICY "ai_usage_read_own" ON public.ai_usage
  FOR SELECT
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());

-- ── Atomic consume: reserve one credit if under the limit ─────────────
-- p_limit < 0 means unlimited. Returns { allowed, used, limit }.
CREATE OR REPLACE FUNCTION public.consume_ai_credit(p_limit INTEGER)
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

  -- Increment atomically, then roll back if the limit is exceeded.
  INSERT INTO public.ai_usage (establishment_id, period_month, credits_used, updated_at)
  VALUES (v_est, v_period, 1, now())
  ON CONFLICT (establishment_id, period_month)
  DO UPDATE SET credits_used = public.ai_usage.credits_used + 1, updated_at = now()
  RETURNING credits_used INTO v_used;

  IF p_limit >= 0 AND v_used > p_limit THEN
    UPDATE public.ai_usage
       SET credits_used = credits_used - 1, updated_at = now()
     WHERE establishment_id = v_est AND period_month = v_period;
    RETURN jsonb_build_object('allowed', false, 'used', p_limit, 'limit', p_limit);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'used', v_used, 'limit', p_limit);
END;
$$;

-- ── Read-only: current month usage for the caller's establishment ─────
CREATE OR REPLACE FUNCTION public.get_ai_usage()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT credits_used FROM public.ai_usage
      WHERE establishment_id = public.current_establishment_id()
        AND period_month = to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM')),
    0
  )
$$;

GRANT EXECUTE ON FUNCTION public.consume_ai_credit(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_usage() TO authenticated;
