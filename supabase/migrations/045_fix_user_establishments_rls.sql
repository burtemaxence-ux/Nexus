-- APPLY MANUALLY in Supabase SQL Editor
-- Scopes user_establishments write to the manager's current establishment
-- Prevents a manager from adding themselves to a competitor's establishment
-- Note: current_establishment_id() must return the correct active establishment per session context
DROP POLICY IF EXISTS "managers_manage_establishment_memberships" ON public.user_establishments;

CREATE POLICY "managers_manage_own_memberships"
ON public.user_establishments
FOR ALL
USING (
  establishment_id = public.current_establishment_id()
  AND public.is_manager()
)
WITH CHECK (
  establishment_id = public.current_establishment_id()
  AND public.is_manager()
);
