-- ============================================================
-- 093 — B3 : l'abonnement ne s'écrit plus depuis le navigateur
-- ============================================================
-- FAILLE CORRIGÉE. Les policies subscriptions_insert / _update / _delete
-- accordaient l'écriture à tout `manager` ou `supervisor` de l'établissement :
--     CHECK (EXISTS (SELECT 1 FROM profiles p
--                     WHERE p.id = auth.uid()
--                       AND p.role = ANY(ARRAY['manager','supervisor'])
--                       AND (p.establishment_id = subscriptions.establishment_id
--                            OR p.active_establishment_id = subscriptions.establishment_id)))
-- Un manager pouvait donc, depuis l'API REST publique :
--     UPDATE subscriptions
--        SET plan = 'enterprise', status = 'active',
--            current_period_end = '2030-01-01'
--      WHERE establishment_id = <le sien>;
-- et s'offrir le plan le plus cher, sans passer par Stripe. Les limites du
-- plan (PLAN_EMPLOYEE_LIMITS) et le paywall lisent cette table : l'élévation
-- est immédiate et facturable à zéro.
--
-- Toutes les écritures légitimes passent par le service-role : upserts du
-- webhook Stripe (app/api/stripe/webhook/route.ts) et crons. Vérifié sur
-- l'ensemble de app/ et lib/ — aucune écriture depuis un client authentifié.
-- checkout, portal, referral, trial-reminder et referral-activation ne font
-- que des SELECT.
--
-- On retire donc les trois policies d'écriture ET les privilèges de table
-- correspondants. Le REVOKE agit ici au niveau TABLE : contrairement au REVOKE
-- de COLONNE de 084, il produit bien son effet.
--
-- SELECT est conservé tel quel. La restriction de la policy SELECT aux colonnes
-- non sensibles (finding M21 — `stripe_customer_id` et `stripe_subscription_id`
-- sont aujourd'hui lisibles par le navigateur via getSubscription) N'EST PAS
-- traitée ici, délibérément : elle exige de basculer /api/stripe/portal et
-- /api/stripe/checkout en service-role et de retoucher lib/subscription.ts.
-- Mélanger ça au correctif de sécurité brouillerait la vérification du chemin
-- de paiement, que le plan impose justement de valider de bout en bout. M21
-- reste à traiter séparément.

DROP POLICY IF EXISTS subscriptions_insert ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_update ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_delete ON public.subscriptions;

-- TRUNCATE inclus : il n'est pas soumis à la RLS.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.subscriptions FROM authenticated, anon;
