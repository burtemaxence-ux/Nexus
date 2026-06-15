-- 046 — Security hardening from Supabase advisors (2026-06-15)
-- Addresses: function_search_path_mutable, anon/authenticated SECURITY DEFINER
-- RPC exposure, and rls_policy_always_true on webhook_logs.

-- 1) Pin search_path on all flagged functions.
--    Their bodies fully qualify public.* objects; built-ins resolve via the
--    implicit pg_catalog, so an empty search_path is safe.
ALTER FUNCTION public.handle_new_user()          SET search_path = '';
ALTER FUNCTION public.is_manager()               SET search_path = '';
ALTER FUNCTION public.update_updated_at()        SET search_path = '';
ALTER FUNCTION public.current_establishment_id() SET search_path = '';
ALTER FUNCTION public.auto_set_establishment_id() SET search_path = '';
ALTER FUNCTION public.log_audit_event()          SET search_path = '';
ALTER FUNCTION public.set_updated_at()           SET search_path = '';

-- 2) Remove RPC exposure on pure trigger functions. They are only ever fired by
--    triggers (which do not require the invoker to hold EXECUTE), never called
--    via /rest/v1/rpc, so revoking is safe and closes the abuse surface.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()           FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_audit_event()           FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_set_establishment_id() FROM anon, authenticated, PUBLIC;

-- NOTE: current_establishment_id() and is_manager() are intentionally left
-- executable by `authenticated`. They are referenced inside RLS policies and
-- are evaluated in the querying user's context, so revoking EXECUTE would break
-- row-level access across the app.

-- 3) Drop the over-permissive INSERT policy on webhook_logs. Webhook rows are
--    written through the service-role admin client (lib/integrations/webhook.ts),
--    which bypasses RLS, so no authenticated/anon insert path is needed.
DROP POLICY IF EXISTS "service insert logs" ON public.webhook_logs;
