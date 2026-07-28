-- 046 — Nettoyage perfs (advisors Supabase) : index de clés étrangères
-- manquants + optimisation de la policy RLS de support_reports.
-- Purement additif / sans changement de comportement.

-- 1. Index sur les clés étrangères non couvertes (advisor 0001).
CREATE INDEX IF NOT EXISTS idx_support_reports_establishment ON public.support_reports (establishment_id);
CREATE INDEX IF NOT EXISTS idx_support_reports_user          ON public.support_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user            ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_home_task_completions_establishment ON public.home_task_completions (establishment_id);

-- 2. Policy RLS de support_reports : évaluer auth.uid() une fois par requête
--    et non par ligne (advisor 0003, auth_rls_initplan).
DROP POLICY IF EXISTS "support_reports_insert_own" ON public.support_reports;
CREATE POLICY "support_reports_insert_own"
  ON public.support_reports FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
