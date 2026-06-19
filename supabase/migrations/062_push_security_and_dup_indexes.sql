-- ============================================================
-- 062 — push_subscriptions read scope + drop duplicate indexes
-- ============================================================
-- 1) push_subscriptions : la policy SELECT héritée ("service role reads all",
--    reprise en push_subscriptions_select USING (true) dans 061) exposait
--    TOUTES les souscriptions à tout utilisateur authentifié. L'envoi de
--    notifications passe par supabaseAdmin (service role, RLS bypassée), donc
--    le USING (true) est inutile. On restreint la lecture à sa propre
--    souscription.
-- 2) subscriptions : deux paires d'index identiques (advisor duplicate_index).
--    On garde les idx_subscriptions_stripe_* et on drop les doublons.
--
-- APPLY MANUALLY (appliquée en prod via apply_migration le 2026-06-19).
-- ============================================================

DROP POLICY IF EXISTS "push_subscriptions_select" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP INDEX IF EXISTS public.subscriptions_stripe_customer_id_idx;
DROP INDEX IF EXISTS public.subscriptions_stripe_subscription_id_idx;
