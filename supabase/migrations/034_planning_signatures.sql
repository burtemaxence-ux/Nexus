-- ============================================================
-- 034 — planning_signatures (migration de rattrapage, audit C4)
-- ============================================================
-- Cette table existe en PRODUCTION mais n'avait aucun CREATE TABLE dans le
-- dépôt : elle avait été créée à la main dans l'éditeur SQL Supabase. La
-- migration 061 la référence, si bien qu'un rejeu du dépôt sur base vierge
-- échouait ("relation public.planning_signatures does not exist").
--
-- Structure et contraintes reproduisent EXACTEMENT l'état de la prod, relevé
-- via information_schema / pg_constraint. Rien n'est corrigé ici.
--
-- Côté policies, on ne recrée QUE `employee_can_sign_own` (INSERT), la seule
-- que 061 laisse intacte et dont la définition est donc lisible en prod. Les
-- deux policies SELECT d'origine (`employee_view_own`, `manager_view_all`) sont
-- supprimées par 061 et n'existent plus nulle part : les réécrire reviendrait à
-- inventer du SQL. 061 crée ensuite `planning_signatures_select` — l'état final
-- est identique dans les deux cas.
--
-- ⚠️ DETTE CONNUE, NON TRAITÉE ICI (finding C5) : la policy SELECT issue de 061
-- autorise TOUT profil de rôle 'manager' sans filtre d'établissement — un
-- manager du tenant A lit les signatures du tenant B. Correction prévue en
-- Phase 2 ; on documente d'abord l'existant.

CREATE TABLE IF NOT EXISTS public.planning_signatures (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid        NOT NULL,
  week_monday date        NOT NULL,
  signed_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planning_signatures_pkey PRIMARY KEY (id),
  CONSTRAINT planning_signatures_employee_id_week_monday_key UNIQUE (employee_id, week_monday),
  CONSTRAINT planning_signatures_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.planning_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_can_sign_own ON public.planning_signatures;
CREATE POLICY employee_can_sign_own
  ON public.planning_signatures FOR INSERT
  WITH CHECK (employee_id = (SELECT auth.uid()));
