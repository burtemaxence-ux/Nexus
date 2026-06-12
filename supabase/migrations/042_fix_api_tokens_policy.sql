-- APPLY MANUALLY in Supabase SQL Editor
-- Removes over-permissive SELECT policy on api_tokens (USING true = all authenticated users)
-- service_role already bypasses RLS — this policy was unnecessary and dangerous
DROP POLICY IF EXISTS "service select tokens" ON public.api_tokens;

CREATE POLICY "managers_read_own_tokens"
ON public.api_tokens
FOR SELECT
USING (
  establishment_id = public.current_establishment_id()
  AND public.is_manager()
);
