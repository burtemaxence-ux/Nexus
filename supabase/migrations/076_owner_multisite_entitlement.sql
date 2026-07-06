-- 076 — Multi-site : l'abonnement couvre TOUS les établissements du propriétaire.
--
-- Problème : un abonnement est rattaché à un seul establishment_id, et l'accès
-- est vérifié par établissement actif. Résultat : un plan Multi-site ne couvrait
-- que l'établissement où il avait été souscrit, pas les autres du même proprio.
--
-- Cette fonction retourne l'abonnement Multi-site actif du propriétaire d'un
-- établissement donné (s'il existe). Utilisée par getSubscription() pour
-- résoudre l'accès au niveau propriétaire.
--
-- SECURITY DEFINER (contourne la RLS pour voir les établissements frères), mais
-- ne répond QUE si l'appelant est bien membre de l'établissement demandé.

CREATE OR REPLACE FUNCTION public.owner_multisite_subscription(p_establishment_id uuid)
RETURNS TABLE (
  plan                  text,
  status                text,
  trial_end             timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean,
  stripe_customer_id    text,
  stripe_subscription_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.plan, s.status, s.trial_end, s.current_period_end,
         s.cancel_at_period_end, s.stripe_customer_id, s.stripe_subscription_id
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
