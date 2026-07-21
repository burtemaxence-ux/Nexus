-- 083 — Révoquer l'EXECUTE anon sur les helpers RLS (advisor
-- anon_security_definer_function_executable, audit 2026-07-21 P1-3).
--
-- `is_manager()` et `current_establishment_id()` sont SECURITY DEFINER et
-- étaient exécutables par `anon` via PostgREST (/rest/v1/rpc/...). Aucun
-- flux non authentifié ne les appelle : les policies RLS les évaluent avec
-- le rôle de la requête (authenticated), et les pages publiques ne
-- requêtent aucune table RLS. On ferme la porte anon ; authenticated
-- conserve l'EXECUTE (nécessaire aux policies).

REVOKE EXECUTE ON FUNCTION public.is_manager() FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_establishment_id() FROM anon;
