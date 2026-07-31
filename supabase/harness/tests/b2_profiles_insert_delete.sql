-- ============================================================================
-- B2 — un client authentifié ne doit pas pouvoir recréer sa ligne `profiles`
-- pour s'attribuer un rôle ou un établissement.
--
-- Couvre les deux faces : l'attaque doit échouer, ET les chemins légitimes
-- (trigger de signup, service-role) doivent continuer de fonctionner — c'est
-- la moitié qu'on oublie, et celle qui casse la production.
--
-- Run: psql -v ON_ERROR_STOP=1 -d <base> -f supabase/harness/tests/b2_profiles_insert_delete.sql
-- ============================================================================
\set ON_ERROR_STOP on

BEGIN;

-- ── Décor ──────────────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('aaaa0000-0000-0000-0000-00000000000a', 'manager-a@resto.test', '{"full_name":"Manager A"}'),
  ('bbbb0000-0000-0000-0000-00000000000b', 'employe@evil.test',    '{"full_name":"Employe"}');

UPDATE public.profiles SET role = 'manager'  WHERE id = 'aaaa0000-0000-0000-0000-00000000000a';
UPDATE public.profiles SET role = 'employee' WHERE id = 'bbbb0000-0000-0000-0000-00000000000b';

-- Le trigger de signup doit avoir fonctionné malgré la garde : il s'exécute en
-- SECURITY DEFINER (`postgres`), pas en `authenticated`.
DO $$
BEGIN
  IF (SELECT count(*) FROM public.profiles) <> 2 THEN
    RAISE EXCEPTION 'B2 : la garde bloque le trigger de signup — % profils au lieu de 2',
      (SELECT count(*) FROM public.profiles);
  END IF;
  RAISE NOTICE 'B2 OK — le trigger de signup passe la garde';
END
$$;

-- L'attaquant connaît l'établissement visé (lien d'invitation, ancien poste…).
SELECT set_config('test.cible',
  (SELECT establishment_id::text FROM public.profiles
    WHERE id = 'aaaa0000-0000-0000-0000-00000000000a'), true);

-- ── Attaque, en vrai rôle authenticated avec JWT ───────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"bbbb0000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE ok BOOLEAN := false;
BEGIN
  BEGIN
    DELETE FROM public.profiles WHERE id = auth.uid();
  EXCEPTION WHEN insufficient_privilege THEN ok := true;
  END;
  IF NOT ok THEN
    RAISE EXCEPTION 'B2 : DELETE de sa propre ligne profiles accepté';
  END IF;
  RAISE NOTICE 'B2 OK — DELETE refusé';
END
$$;

DO $$
DECLARE ok BOOLEAN := false; tenant UUID;
BEGIN
  tenant := current_setting('test.cible')::uuid;
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, establishment_id)
    VALUES ('bbbb0000-0000-0000-0000-00000000000b', 'employe@evil.test', 'Employe', 'manager', tenant);
  EXCEPTION WHEN insufficient_privilege THEN ok := true;
  END;
  IF NOT ok THEN
    RAISE EXCEPTION 'B2 : INSERT d''un profil manager accepté';
  END IF;
  RAISE NOTICE 'B2 OK — INSERT refusé';
END
$$;

-- Se réinsérer comme simple EMPLOYÉ du tenant visé suffirait aussi : la garde
-- ne doit donc pas dépendre du rôle demandé.
DO $$
DECLARE ok BOOLEAN := false; tenant UUID;
BEGIN
  tenant := current_setting('test.cible')::uuid;
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, establishment_id)
    VALUES ('dddd0000-0000-0000-0000-00000000000d', 'x@evil.test', 'X', 'employee', tenant);
  EXCEPTION WHEN insufficient_privilege THEN ok := true;
  END;
  IF NOT ok THEN
    RAISE EXCEPTION 'B2 : INSERT d''un profil employee accepté — rattachement au tenant visé possible';
  END IF;
  RAISE NOTICE 'B2 OK — INSERT employee refusé aussi';
END
$$;

-- L'attaquant doit être resté dans son propre tenant.
DO $$
DECLARE mine UUID; tenant UUID; r TEXT;
BEGIN
  SELECT establishment_id, role INTO mine, r
    FROM public.profiles WHERE id = 'bbbb0000-0000-0000-0000-00000000000b';
  tenant := current_setting('test.cible')::uuid;
  IF mine = tenant OR r <> 'employee' THEN
    RAISE EXCEPTION 'B2 : attaquant échappé — role=%, tenant visé atteint=%', r, (mine = tenant);
  END IF;
  RAISE NOTICE 'B2 OK — attaquant toujours employee de son propre tenant';
END
$$;

RESET ROLE;

-- ── Le service-role doit rester libre d'agir ───────────────────────────────
-- Ce sont exactement les opérations de /api/employees/invite : le trigger a
-- déjà créé le profil, la route le RÉAFFECTE (rôle réel + établissement du
-- manager). Plus la suppression de compte, également en service-role.
SET LOCAL ROLE service_role;
DO $$
DECLARE tenant UUID; r TEXT; e UUID;
BEGIN
  tenant := current_setting('test.cible')::uuid;

  UPDATE public.profiles
     SET role = 'supervisor', establishment_id = tenant
   WHERE id = 'bbbb0000-0000-0000-0000-00000000000b';

  SELECT role, establishment_id INTO r, e
    FROM public.profiles WHERE id = 'bbbb0000-0000-0000-0000-00000000000b';
  IF r <> 'supervisor' OR e <> tenant THEN
    RAISE EXCEPTION 'B2 : la garde bloque la réaffectation service-role — invitations cassées (role=%, estab=%)', r, e;
  END IF;

  DELETE FROM public.profiles WHERE id = 'bbbb0000-0000-0000-0000-00000000000b';
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = 'bbbb0000-0000-0000-0000-00000000000b') THEN
    RAISE EXCEPTION 'B2 : la garde bloque la suppression service-role';
  END IF;

  RAISE NOTICE 'B2 OK — service_role réaffecte et supprime toujours un profil';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE EXCEPTION 'B2 : la garde bloque le service-role — invitations cassées';
END
$$;
RESET ROLE;

ROLLBACK;
