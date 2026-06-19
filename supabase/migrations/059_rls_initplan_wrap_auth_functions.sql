-- 059 — Perf RLS : auth_rls_initplan (41 → 0).
-- Enveloppe auth.uid()/jwt()/role() dans (select …) dans toutes les policies
-- concernées → la fonction auth est évaluée 1× par requête (initplan) au lieu
-- d'1× par ligne. Transformation PROUVÉE équivalente (même valeur retournée) :
-- aucun changement de comportement, uniquement la performance à grande échelle.
-- Bloc atomique : rollback total en cas d'erreur. Appliqué en prod le 2026-06-18.
--
-- NON traité (volontairement, hors de cette migration sûre) :
--   * multiple_permissive_policies (149) : fusionner des policies n'est PAS
--     une transformation équivalente → nécessite des tests de comportement
--     (idéalement une branche Supabase Pro). Laissé en l'état.
--   * unused_index (31) : la détection "inutilisé" n'est pas fiable sans trafic
--     réel (0 client) → ne pas supprimer.
--   * SECURITY DEFINER exposées : REVOKE risque de casser la RLS → à tester.

DO $$
DECLARE
  r record;
  q text;
  wc text;
BEGIN
  FOR r IN
    SELECT tablename, policyname, permissive, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual,'') ~ 'auth\.(uid|jwt|role)\(\)'
        OR coalesce(with_check,'') ~ 'auth\.(uid|jwt|role)\(\)')
  LOOP
    q := replace(replace(replace(r.qual, 'auth.uid()', '(select auth.uid())'), 'auth.jwt()', '(select auth.jwt())'), 'auth.role()', '(select auth.role())');
    wc := replace(replace(replace(r.with_check, 'auth.uid()', '(select auth.uid())'), 'auth.jwt()', '(select auth.jwt())'), 'auth.role()', '(select auth.role())');
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s',
      r.policyname, r.tablename, r.permissive, r.cmd,
      array_to_string(r.roles, ', '),
      CASE WHEN r.qual IS NOT NULL THEN ' USING (' || q || ')' ELSE '' END,
      CASE WHEN r.with_check IS NOT NULL THEN ' WITH CHECK (' || wc || ')' ELSE '' END
    );
  END LOOP;
END $$;
