-- ============================================================
-- 071 — Establishment benchmark foundation
-- ============================================================
-- Fondation de données interne pour la future feature de classement des
-- établissements (optimisation planning + conformité). Multi-tenant : les
-- données cross-tenant restent internes (vue non lisible par les clients),
-- chaque manager ne lit que SON score + une cohorte anonymisée.
--
-- Crée :
--   * vue public.establishment_metrics          (agrégats bruts par établissement)
--   * table public.establishment_benchmark_scores (snapshots de scores)
--   * fonction public.get_establishment_benchmark  (lecture sûre own + cohorte)
--
-- APPLY MANUALLY dans le SQL Editor Supabase.
-- ============================================================

-- ── 1. Vue de métriques brutes (fenêtre glissante 30 jours) ──────────────────
-- Une ligne par établissement. Les tables shifts / lateness_records / leave_requests
-- ne portent pas establishment_id : on remonte via profiles.establishment_id.
CREATE OR REPLACE VIEW public.establishment_metrics AS
SELECT
  e.id                                              AS establishment_id,
  COALESCE(emp.headcount, 0)                        AS headcount,
  COALESCE(ca.active_alerts, 0)                     AS active_alerts,
  COALESCE(ca.critical_alerts, 0)                   AS critical_alerts,
  COALESCE(ca.warning_alerts, 0)                    AS warning_alerts,
  COALESCE(lr.unjustified_lateness_30d, 0)          AS unjustified_lateness_30d,
  COALESCE(sh.shifts_30d, 0)                        AS shifts_30d,
  COALESCE(sh.published_shifts_30d, 0)              AS published_shifts_30d,
  COALESCE(ms.open_marketplace_slots, 0)            AS open_marketplace_slots,
  COALESCE(ms.filled_marketplace_slots_30d, 0)      AS filled_marketplace_slots_30d,
  COALESCE(lv.pending_leaves, 0)                    AS pending_leaves
FROM public.establishments e
LEFT JOIN (
  SELECT establishment_id, count(*) AS headcount
  FROM public.profiles
  WHERE role = 'employee' AND archived IS NOT TRUE
  GROUP BY establishment_id
) emp ON emp.establishment_id = e.id
LEFT JOIN (
  SELECT establishment_id,
    count(*) FILTER (WHERE status = 'active')                        AS active_alerts,
    count(*) FILTER (WHERE status = 'active' AND level = 'CRITICAL') AS critical_alerts,
    count(*) FILTER (WHERE status = 'active' AND level = 'WARNING')  AS warning_alerts
  FROM public.compliance_alerts
  GROUP BY establishment_id
) ca ON ca.establishment_id = e.id
LEFT JOIN (
  SELECT p.establishment_id, count(*) AS unjustified_lateness_30d
  FROM public.lateness_records l
  JOIN public.profiles p ON p.id = l.employee_id
  WHERE l.justified = FALSE
    AND l.date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY p.establishment_id
) lr ON lr.establishment_id = e.id
LEFT JOIN (
  SELECT p.establishment_id,
    count(*)                                          AS shifts_30d,
    count(*) FILTER (WHERE s.status = 'published')    AS published_shifts_30d
  FROM public.shifts s
  JOIN public.profiles p ON p.id = s.employee_id
  WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY p.establishment_id
) sh ON sh.establishment_id = e.id
LEFT JOIN (
  SELECT establishment_id,
    count(*) FILTER (WHERE status = 'open')   AS open_marketplace_slots,
    count(*) FILTER (WHERE status = 'filled'
      AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS filled_marketplace_slots_30d
  FROM public.marketplace_slots
  GROUP BY establishment_id
) ms ON ms.establishment_id = e.id
LEFT JOIN (
  SELECT p.establishment_id, count(*) AS pending_leaves
  FROM public.leave_requests lq
  JOIN public.profiles p ON p.id = lq.employee_id
  WHERE lq.status = 'pending'
  GROUP BY p.establishment_id
) lv ON lv.establishment_id = e.id;

-- Vue cross-tenant : lecture réservée au service-role (writer interne). Les
-- clients authentifiés ne doivent JAMAIS lire les métriques des autres.
REVOKE ALL ON public.establishment_metrics FROM PUBLIC, anon, authenticated;

-- ── 2. Table des snapshots de scores ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.establishment_benchmark_scores (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id      UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  period_start          DATE NOT NULL,
  -- Scores absolus 0–100 (barème métier)
  planning_score        NUMERIC(5,2) NOT NULL,
  compliance_score      NUMERIC(5,2) NOT NULL,
  global_score          NUMERIC(5,2) NOT NULL,
  -- Position relative 0–100 dans la cohorte
  planning_percentile   NUMERIC(5,2),
  compliance_percentile NUMERIC(5,2),
  global_percentile     NUMERIC(5,2),
  metrics               JSONB NOT NULL DEFAULT '{}',
  computed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (establishment_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_benchmark_scores_establishment_period
  ON public.establishment_benchmark_scores (establishment_id, period_start DESC);

ALTER TABLE public.establishment_benchmark_scores ENABLE ROW LEVEL SECURITY;

-- Manager / superviseur : lecture de SON établissement uniquement
-- (même pattern que compliance_alerts).
CREATE POLICY "Managers read own benchmark scores"
  ON public.establishment_benchmark_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'supervisor')
        AND (p.establishment_id = establishment_benchmark_scores.establishment_id
          OR p.active_establishment_id = establishment_benchmark_scores.establishment_id)
    )
  );

-- Pas de policy INSERT/UPDATE/DELETE : écriture uniquement via service-role
-- (writer lib/benchmark/snapshot.ts). Les employés n'ont aucun accès.

CREATE TRIGGER establishment_benchmark_scores_updated_at
  BEFORE UPDATE ON public.establishment_benchmark_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. Lecture sûre : own score + cohorte anonymisée ─────────────────────────
-- Ne renvoie JAMAIS l'identité ni les scores nominatifs des autres
-- établissements — uniquement des agrégats de cohorte.
CREATE OR REPLACE FUNCTION public.get_establishment_benchmark(p_period DATE DEFAULT NULL)
RETURNS TABLE (
  period_start          DATE,
  planning_score        NUMERIC,
  compliance_score      NUMERIC,
  global_score          NUMERIC,
  planning_percentile   NUMERIC,
  compliance_percentile NUMERIC,
  global_percentile     NUMERIC,
  cohort_size           INTEGER,
  cohort_avg_planning   NUMERIC,
  cohort_avg_compliance NUMERIC,
  cohort_avg_global     NUMERIC,
  cohort_median_global  NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_est    UUID := public.current_establishment_id();
  v_period DATE;
BEGIN
  IF NOT public.is_manager() OR v_est IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(p_period, max(s.period_start))
    INTO v_period
    FROM public.establishment_benchmark_scores s;

  IF v_period IS NULL THEN
    RETURN;  -- aucun snapshot calculé
  END IF;

  RETURN QUERY
  WITH cohort AS (
    SELECT * FROM public.establishment_benchmark_scores s
    WHERE s.period_start = v_period
  )
  SELECT
    own.period_start,
    own.planning_score,
    own.compliance_score,
    own.global_score,
    own.planning_percentile,
    own.compliance_percentile,
    own.global_percentile,
    (SELECT count(*)::int FROM cohort),
    (SELECT round(avg(c.planning_score), 2) FROM cohort c),
    (SELECT round(avg(c.compliance_score), 2) FROM cohort c),
    (SELECT round(avg(c.global_score), 2) FROM cohort c),
    (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY c.global_score), 2) FROM cohort c)
  FROM cohort own
  WHERE own.establishment_id = v_est;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_establishment_benchmark(DATE) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_establishment_benchmark(DATE) TO authenticated;
