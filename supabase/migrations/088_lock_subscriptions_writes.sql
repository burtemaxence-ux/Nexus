-- ============================================================
-- 088 — Verrouillage des écritures sur subscriptions (B3)
-- ============================================================
-- FAILLE CORRIGÉE (bloquante, audit du 2026-07-25) :
-- Les policies subscriptions_insert / subscriptions_update (061:261 et 061:264)
-- autorisaient tout manager ou superviseur du tenant à écrire sa propre ligne
-- d'abonnement. Or c'est cette table qui porte l'entitlement : lib/subscription.ts
-- et lib/plan-guard.ts la lisent via le client utilisateur. Un client pouvait
-- donc, depuis son navigateur :
--
--   await supabase.from('subscriptions')
--     .update({ plan: 'multisite', status: 'active' })
--     .eq('establishment_id', monEtablissement)
--
-- et débloquer toutes les fonctions payantes (149 €/mois) sans aucune trace côté
-- Stripe, aucun cron de réconciliation ne rattrapant la divergence.
--
-- Vérifié avant écriture : SEUL le webhook Stripe écrit cette table
-- (app/api/stripe/webhook/route.ts:67 et :98), via le service-role. Aucune
-- écriture applicative côté utilisateur — le verrouillage ne casse rien.
--
-- LECTURE : le SELECT ne peut PAS être réservé aux managers.
-- app/(dashboard)/layout.tsx:100 appelle getSubscription() dans un layout
-- partagé, donc en contexte employé : restreindre la ligne casserait le tableau
-- de bord employé. La granularité correcte est la COLONNE — les identifiants
-- Stripe n'ont aucune raison d'être lisibles par un salarié.
--
-- L'ordre REVOKE(table) → GRANT(colonnes) est impératif : l'inverse est sans
-- effet, c'est exactement l'erreur qui a rendu la migration 084 inopérante.
-- ============================================================

DROP POLICY IF EXISTS "subscriptions_insert" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_delete" ON public.subscriptions;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.subscriptions FROM PUBLIC, anon, authenticated;

-- 1) On retire le SELECT au niveau TABLE (sinon tout GRANT de colonne est
--    absorbé par le privilège de table et n'a aucun effet).
REVOKE SELECT ON public.subscriptions FROM PUBLIC, anon, authenticated;

-- 2) On ré-accorde colonne par colonne, sans stripe_customer_id ni
--    stripe_subscription_id.
GRANT SELECT (
  id,
  establishment_id,
  user_id,
  plan,
  status,
  trial_end,
  current_period_end,
  cancel_at_period_end,
  updated_at
) ON public.subscriptions TO authenticated;

-- 3) Même traitement pour la porte dérobée : owner_multisite_subscription est
--    SECURITY DEFINER, donc les GRANT de colonnes ci-dessus ne s'y appliquent
--    pas. Elle renvoyait les deux identifiants Stripe à tout membre de
--    l'établissement. Contrôle d'appartenance inchangé.
--    DROP obligatoire : CREATE OR REPLACE ne peut pas modifier le type de
--    retour d'une fonction (« cannot change return type of existing function »).
DROP FUNCTION IF EXISTS public.owner_multisite_subscription(uuid);

CREATE FUNCTION public.owner_multisite_subscription(p_establishment_id uuid)
RETURNS TABLE(
  plan TEXT,
  status TEXT,
  trial_end TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.plan, s.status, s.trial_end, s.current_period_end, s.cancel_at_period_end
  FROM establishments e_target
  JOIN establishments e_owned ON e_owned.owner_id = e_target.owner_id
  JOIN subscriptions s        ON s.establishment_id = e_owned.id
  WHERE e_target.id = p_establishment_id
    AND e_target.owner_id IS NOT NULL
    AND s.plan = 'multisite'
    AND s.status IN ('active', 'trialing', 'past_due')
    AND EXISTS (
      SELECT 1 FROM user_establishments ue
      WHERE ue.establishment_id = p_establishment_id
        AND ue.user_id = auth.uid()
    )
  ORDER BY (s.status = 'active') DESC, s.current_period_end DESC NULLS LAST
  LIMIT 1;
$$;

REVOKE ALL     ON FUNCTION public.owner_multisite_subscription(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.owner_multisite_subscription(uuid) TO authenticated, service_role;
