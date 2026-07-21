-- 080 — Perf RLS : initplan sur les tables créées après la passe 059.
-- (Numérotation : 075-079 sautées — 078/079 existent déjà côté prod,
-- appliquées sans fichier local ; on repart au-dessus.)
--
-- La migration 059 avait éliminé les 41 `auth_rls_initplan` de l'époque, mais
-- `home_task_completions` (071) et `deletion_requests` (073) ont été créées
-- ensuite avec des policies non enveloppées. Même transformation prouvée
-- équivalente : auth.uid() → (select auth.uid()), évalué 1× par requête au
-- lieu d'1× par ligne. On restreint aussi TO authenticated (convention 061).
--
-- Bonus advisor : index couvrant la FK deletion_requests.requested_by
-- (unindexed_foreign_keys).
--
-- NON traité (volontairement) : les ~31 `unused_index` (INFO). La quasi-
-- totalité sont des index de FK posés exprès par 046/055 — les supprimer
-- réintroduirait l'alerte `unindexed_foreign_keys` et pénaliserait les
-- suppressions en cascade. « Unused » ne signifie ici que « pas encore de
-- trafic ». Les vrais doublons ont été supprimés en 062.

-- ── deletion_requests ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "managers manage own deletion requests" ON public.deletion_requests;
CREATE POLICY "managers manage own deletion requests" ON public.deletion_requests
  FOR ALL TO authenticated
  USING (
    establishment_id = current_establishment_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'manager'
    )
  );

CREATE INDEX IF NOT EXISTS idx_deletion_requests_requested_by
  ON public.deletion_requests (requested_by);

-- ── home_task_completions ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Users read own home task completions" ON public.home_task_completions;
CREATE POLICY "Users read own home task completions"
  ON public.home_task_completions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users insert own home task completions" ON public.home_task_completions;
CREATE POLICY "Users insert own home task completions"
  ON public.home_task_completions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users delete own home task completions" ON public.home_task_completions;
CREATE POLICY "Users delete own home task completions"
  ON public.home_task_completions FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
