-- 075 — Aligne les contraintes de `subscriptions` sur le code et sur Stripe.
--
-- Bug détecté : la CHECK `plan` n'autorisait que ('essentiel','pro','multi'),
-- alors que le webhook Stripe (resolvePlan) écrit 'essential' / 'multisite' /
-- 'free', et plan-guard lit 'essential' / 'multisite'. Conséquence : un
-- abonnement Essentiel ou Multi-site, ou toute résiliation (plan='free'),
-- faisait échouer l'upsert du webhook → l'abonnement client n'était jamais
-- synchronisé. De même, la CHECK `status` refusait des statuts réels de Stripe
-- (incomplete, unpaid, paused…).

-- 1. Retirer les anciennes contraintes AVANT de migrer la donnée
--    (sinon l'ancienne CHECK bloque les nouvelles valeurs).
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- 2. Migration des anciennes valeurs vers le vocabulaire du code.
UPDATE public.subscriptions SET plan = 'essential' WHERE plan = 'essentiel';
UPDATE public.subscriptions SET plan = 'multisite'  WHERE plan = 'multi';

-- 3. Nouvelle CHECK `plan` : valeurs produites par resolvePlan() / lues par plan-guard.
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan = ANY (ARRAY['free', 'essential', 'pro', 'multisite']));

-- 4. Nouvelle CHECK `status` : jeu complet des statuts Stripe (+ 'none' legacy).
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status = ANY (ARRAY[
    'trialing', 'active', 'past_due', 'canceled',
    'unpaid', 'incomplete', 'incomplete_expired', 'paused', 'none'
  ]));
