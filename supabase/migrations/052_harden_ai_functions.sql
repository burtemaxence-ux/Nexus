-- ============================================================
-- 052 — Harden AI quota functions (revoke anon/public execute)
-- ============================================================
-- consume_ai_credit / get_ai_usage are SECURITY DEFINER and only meaningful
-- for an authenticated manager (they guard on current_establishment_id() /
-- is_manager()). Revoke the default PUBLIC/anon EXECUTE so they are not
-- callable unauthenticated via the REST RPC endpoint.
--
-- APPLY MANUALLY in the Supabase SQL Editor.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.consume_ai_credit(INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_ai_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_credit(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_usage() TO authenticated;
