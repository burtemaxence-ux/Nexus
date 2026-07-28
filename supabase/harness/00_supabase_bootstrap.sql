-- ============================================================================
-- Harnais de rejeu — reproduction locale de l'environnement Supabase
-- ============================================================================
-- Permet de rejouer supabase/migrations/*.sql sur un Postgres vierge (CI,
-- vérification de dérive de schéma) sans dépendre du CLI Supabase ni de Docker.
--
-- FIDÉLITÉ : les valeurs ci-dessous sont copiées de la prod, pas devinées.
-- Le point critique est le bloc ALTER DEFAULT PRIVILEGES : sur Supabase, toute
-- table créée dans `public` reçoit automatiquement TOUS les privilèges DML pour
-- `anon` et `authenticated`. Un harnais qui l'omettrait donnerait un faux vert
-- sur les tests d'isolation — la RLS est le seul rempart, pas les GRANT.
--
-- Relevé prod (pg_default_acl, schema=public, objtype=r) :
--   {postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres,
--    authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres}
--
-- Usage :  psql -f supabase/harness/00_supabase_bootstrap.sql
-- ============================================================================

-- --- Rôles de la plateforme -------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin NOLOGIN;
  END IF;
END
$$;

GRANT anon, authenticated, service_role TO authenticator;

-- --- Schémas ----------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS auth       AUTHORIZATION supabase_auth_admin;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto   WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA public     TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth       TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage    TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- Les migrations appellent uuid_generate_v4() sans préfixer le schéma.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET search_path TO public, extensions', current_database());
END
$$;

-- --- auth.users -------------------------------------------------------------
-- Colonnes reprises à l'identique de la prod (information_schema.columns).
CREATE TABLE IF NOT EXISTS auth.users (
  instance_id                 uuid,
  id                          uuid        NOT NULL PRIMARY KEY,
  aud                         varchar(255),
  role                        varchar(255),
  email                       varchar(255),
  encrypted_password          varchar(255),
  email_confirmed_at          timestamptz,
  invited_at                  timestamptz,
  confirmation_token          varchar(255),
  confirmation_sent_at        timestamptz,
  recovery_token              varchar(255),
  recovery_sent_at            timestamptz,
  email_change_token_new      varchar(255),
  email_change                varchar(255),
  email_change_sent_at        timestamptz,
  last_sign_in_at             timestamptz,
  raw_app_meta_data           jsonb,
  raw_user_meta_data          jsonb,
  is_super_admin              boolean,
  created_at                  timestamptz,
  updated_at                  timestamptz,
  phone                       text UNIQUE,
  phone_confirmed_at          timestamptz,
  phone_change                text,
  phone_change_token          varchar(255),
  phone_change_sent_at        timestamptz,
  confirmed_at                timestamptz,
  email_change_token_current  varchar(255),
  email_change_confirm_status smallint,
  banned_until                timestamptz,
  reauthentication_token      varchar(255),
  reauthentication_sent_at    timestamptz,
  is_sso_user                 boolean NOT NULL DEFAULT false,
  deleted_at                  timestamptz,
  is_anonymous                boolean NOT NULL DEFAULT false
);

-- --- Helpers auth.* ---------------------------------------------------------
-- Implémentations Supabase : les claims sont lues dans les GUC de la requête,
-- ce qui permet aux tests de simuler un JWT via set_config('request.jwt.claims', ...).
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim',  true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;

GRANT EXECUTE ON FUNCTION auth.uid(), auth.role(), auth.jwt()
  TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO service_role;

-- --- storage ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS storage.buckets (
  id                 text PRIMARY KEY,
  name               text NOT NULL,
  owner              uuid,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  public             boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id               uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  bucket_id        text REFERENCES storage.buckets(id),
  name             text,
  owner            uuid,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata         jsonb,
  path_tokens      text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
  version          text
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
GRANT ALL ON storage.objects, storage.buckets TO anon, authenticated, service_role;

-- --- Privilèges par défaut (LE point critique — voir en-tête) ---------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
