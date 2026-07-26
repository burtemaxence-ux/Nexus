-- ============================================================================
-- B3 — un manager ne doit pas pouvoir s'attribuer un abonnement.
--
-- Stripe est la source de vérité ; `subscriptions` n'est qu'un cache écrit par
-- le webhook en service-role. Un manager qui écrit dedans s'offre le plan le
-- plus cher gratuitement — les limites de plan et le paywall lisent cette table.
--
-- Run: psql -v ON_ERROR_STOP=1 -d <base> -f supabase/harness/tests/b3_subscriptions_readonly.sql
-- ============================================================================
\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('eeee0000-0000-0000-0000-00000000000e', 'manager-b3@resto.test', '{"full_name":"Manager B3"}');
UPDATE public.profiles SET role = 'manager' WHERE id = 'eeee0000-0000-0000-0000-00000000000e';

-- Abonnement d'essai posé par le webhook (service-role).
INSERT INTO public.subscriptions (establishment_id, user_id, plan, status)
SELECT establishment_id, 'eeee0000-0000-0000-0000-00000000000e', 'essential', 'trialing'
  FROM public.profiles WHERE id = 'eeee0000-0000-0000-0000-00000000000e';

SELECT set_config('request.jwt.claims',
  '{"sub":"eeee0000-0000-0000-0000-00000000000e","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

-- ── Le manager doit toujours LIRE son abonnement (paywall, limites de plan) ──
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM public.subscriptions;
  IF n <> 1 THEN
    RAISE EXCEPTION 'B3 : le manager ne lit plus son abonnement (% lignes) — paywall cassé', n;
  END IF;
  RAISE NOTICE 'B3 OK — lecture de son propre abonnement conservée';
END
$$;

-- ── Mais il ne doit rien pouvoir écrire ────────────────────────────────────
DO $$
DECLARE ok BOOLEAN := false;
BEGIN
  BEGIN
    UPDATE public.subscriptions
       SET plan = 'multisite', status = 'active', current_period_end = '2030-01-01';
  EXCEPTION WHEN insufficient_privilege THEN ok := true;
  END;
  IF NOT ok THEN
    RAISE EXCEPTION 'B3 : UPDATE du plan accepté — auto-attribution possible';
  END IF;
  RAISE NOTICE 'B3 OK — UPDATE refusé';
END
$$;

DO $$
DECLARE ok BOOLEAN := false;
BEGIN
  BEGIN
    INSERT INTO public.subscriptions (establishment_id, plan, status)
    SELECT establishment_id, 'multisite', 'active' FROM public.profiles
     WHERE id = 'eeee0000-0000-0000-0000-00000000000e';
  EXCEPTION WHEN insufficient_privilege THEN ok := true;
       WHEN unique_violation      THEN ok := true;  -- bloqué plus tôt encore
  END;
  IF NOT ok THEN
    RAISE EXCEPTION 'B3 : INSERT d''un abonnement accepté';
  END IF;
  RAISE NOTICE 'B3 OK — INSERT refusé';
END
$$;

DO $$
DECLARE ok BOOLEAN := false;
BEGIN
  BEGIN
    DELETE FROM public.subscriptions;
  EXCEPTION WHEN insufficient_privilege THEN ok := true;
  END;
  IF NOT ok THEN
    RAISE EXCEPTION 'B3 : DELETE d''un abonnement accepté';
  END IF;
  RAISE NOTICE 'B3 OK — DELETE refusé';
END
$$;

-- Le plan doit être resté celui posé par le webhook.
DO $$
DECLARE p TEXT; s TEXT;
BEGIN
  SELECT plan, status INTO p, s FROM public.subscriptions;
  IF p <> 'essential' OR s <> 'trialing' THEN
    RAISE EXCEPTION 'B3 : abonnement altéré — plan=%, status=%', p, s;
  END IF;
  RAISE NOTICE 'B3 OK — abonnement intact (essential/trialing)';
END
$$;

RESET ROLE;

-- ── Le webhook (service-role) doit garder la main ──────────────────────────
SET LOCAL ROLE service_role;
DO $$
BEGIN
  UPDATE public.subscriptions SET plan = 'pro', status = 'active';
  IF (SELECT plan FROM public.subscriptions) <> 'pro' THEN
    RAISE EXCEPTION 'B3 : le service-role ne peut plus écrire — webhook Stripe cassé';
  END IF;
  RAISE NOTICE 'B3 OK — service_role écrit toujours (webhook Stripe)';
END
$$;
RESET ROLE;

ROLLBACK;
