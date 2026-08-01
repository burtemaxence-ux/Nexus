-- ============================================================
-- 086 — Répare les comptes d'authentification semés directement en SQL
-- ============================================================
-- Symptôme : /admin/generate_link renvoyait 500 sur les comptes de
-- démonstration —
--   « duplicate key value violates unique constraint users_email_partial_key »
-- ce qui faisait échouer l'ouverture de session de /demo.
--
-- Cause : ces comptes ont été insérés dans auth.users sans `instance_id`, et
-- avec les colonnes de jetons à NULL. GoTrue recherche ses utilisateurs avec
-- `WHERE instance_id = '00000000-…' AND email = …`. Comme NULL n'est jamais
-- égal à quoi que ce soit, la recherche ne les trouvait jamais : GoTrue en
-- concluait que le compte n'existait pas et partait le créer — et l'INSERT se
-- heurtait à `users_email_partial_key`, un index unique sur l'email SEUL
-- (`ON auth.users (email) WHERE is_sso_user = false`), qui, lui, voyait très
-- bien la ligne existante.
--
-- Portée réelle, au-delà de la démo : les 9 comptes concernés étaient
-- inutilisables depuis leur création — aucun ne s'était jamais connecté, ce que
-- confirmait `last_sign_in_at` à NULL sur l'ensemble. GoTrue attend par ailleurs
-- des chaînes vides, et non des NULL, dans ses colonnes de jetons : 6 comptes
-- supplémentaires étaient dans ce cas.
--
-- Appliqué en production le 01/08/2026 (15 lignes corrigées, 0 NULL restant).
-- Idempotent : sans effet sur une base saine, donc sans effet sur une base
-- neuve — les comptes créés par le flux normal d'inscription sont corrects.
--
-- Leçon pour la suite : ne pas insérer d'utilisateurs directement dans
-- auth.users. Passer par l'API d'administration Supabase, qui renseigne les
-- colonnes internes que GoTrue attend.

UPDATE auth.users SET
  instance_id                = COALESCE(instance_id, '00000000-0000-0000-0000-000000000000'::uuid),
  confirmation_token         = COALESCE(confirmation_token, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  email_change               = COALESCE(email_change, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change               = COALESCE(phone_change, ''),
  phone_change_token         = COALESCE(phone_change_token, ''),
  reauthentication_token     = COALESCE(reauthentication_token, '')
WHERE instance_id IS NULL
   OR confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR reauthentication_token IS NULL;
