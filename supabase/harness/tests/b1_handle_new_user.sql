-- ============================================================================
-- B1 — le trigger handle_new_user ne doit rien accorder sur la foi des
-- métadonnées d'inscription, qui sont contrôlées par le navigateur.
--
-- Chaque assertion lève une exception si elle échoue → psql -v ON_ERROR_STOP=1
-- rend un code de sortie non nul, la CI casse.
--
-- Run: psql -v ON_ERROR_STOP=1 -d <base> -f supabase/harness/tests/b1_handle_new_user.sql
-- ============================================================================
\set ON_ERROR_STOP on

BEGIN;

-- ── Décor : un manager légitime, tenant A ──────────────────────────────────
-- Créé par le trigger puis promu en service-role, comme dans l'application.
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('aaaaaaaa-0000-0000-0000-00000000000a', 'manager-a@resto.test',
        '{"full_name":"Manager A"}'::jsonb);

UPDATE public.profiles SET role = 'manager'
 WHERE id = 'aaaaaaaa-0000-0000-0000-00000000000a';

-- ── Attaque : inscription publique avec métadonnées forgées ────────────────
INSERT INTO auth.users (id, email, raw_user_meta_data)
SELECT 'bbbbbbbb-0000-0000-0000-00000000000b', 'attaquant@evil.test',
       jsonb_build_object(
         'role',             'manager',
         'establishment_id',  p.establishment_id::text,
         'full_name',        'Attaquant')
  FROM public.profiles p
 WHERE p.id = 'aaaaaaaa-0000-0000-0000-00000000000a';

DO $$
DECLARE
  tenant_a   UUID;
  atk_estab  UUID;
  atk_owner  UUID;
BEGIN
  SELECT establishment_id INTO tenant_a
    FROM public.profiles WHERE id = 'aaaaaaaa-0000-0000-0000-00000000000a';
  SELECT establishment_id INTO atk_estab
    FROM public.profiles WHERE id = 'bbbbbbbb-0000-0000-0000-00000000000b';

  -- Le rôle n'est volontairement pas contraint à 'employee' : un compte
  -- propriétaire de l'établissement qu'il vient de créer est légitimement
  -- manager. Ce qui doit être impossible, c'est de DÉSIGNER un tenant tiers.
  IF atk_estab = tenant_a THEN
    RAISE EXCEPTION 'B1 : establishment_id forgé accepté — attaquant rattaché au tenant A (%)', tenant_a;
  END IF;

  IF atk_estab IS NULL THEN
    RAISE EXCEPTION 'B1 : aucun établissement créé pour le nouveau compte';
  END IF;

  -- L'établissement neuf doit lui appartenir, pas être un tenant tiers.
  SELECT owner_id INTO atk_owner FROM public.establishments WHERE id = atk_estab;
  IF atk_owner <> 'bbbbbbbb-0000-0000-0000-00000000000b' THEN
    RAISE EXCEPTION 'B1 : établissement % non détenu par le nouveau compte (owner=%)', atk_estab, atk_owner;
  END IF;

  RAISE NOTICE 'B1 OK — établissement propre % (détenu par le compte) ≠ tenant A %', atk_estab, tenant_a;
END
$$;

-- ── Le rôle ne doit plus provenir des métadonnées ──────────────────────────
-- Métadonnées vides : le compte doit tout de même être manager de SON
-- établissement. Preuve que le rôle est déduit, pas dicté par le client — et
-- que le tunnel d'inscription publique reste fonctionnel.
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('cccccccc-0000-0000-0000-00000000000c', 'sans-metadata@resto.test', '{}'::jsonb);

DO $$
DECLARE r TEXT; e UUID; o UUID;
BEGIN
  SELECT role, establishment_id INTO r, e
    FROM public.profiles WHERE id = 'cccccccc-0000-0000-0000-00000000000c';
  SELECT owner_id INTO o FROM public.establishments WHERE id = e;

  IF r <> 'manager' OR o <> 'cccccccc-0000-0000-0000-00000000000c' THEN
    RAISE EXCEPTION 'B1 : inscription sans métadonnées cassée — role=%, owner=%', r, o;
  END IF;
  RAISE NOTICE 'B1 OK — inscription sans métadonnées : manager de son propre établissement';
END
$$;

-- ── Le tenant A ne doit pas avoir gagné d'occupant ─────────────────────────
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM public.profiles
   WHERE establishment_id = (SELECT establishment_id FROM public.profiles
                              WHERE id = 'aaaaaaaa-0000-0000-0000-00000000000a');
  IF n <> 1 THEN
    RAISE EXCEPTION 'B1 : le tenant A compte % profils au lieu de 1', n;
  END IF;
  RAISE NOTICE 'B1 OK — tenant A toujours isolé (1 profil)';
END
$$;

ROLLBACK;
