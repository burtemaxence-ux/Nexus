-- Fix over-permissive establishments RLS policy
-- MUST also be applied in Supabase SQL Editor
--
-- Before: any manager could read/write ALL establishments (cross-tenant)
-- After:  a manager can only access their own establishment(s)
--         - owner_id = auth.uid()            → the account owner
--         - current_establishment_id()       → the active establishment of this session
--         - user_establishments membership   → all establishments the manager is linked to
--           (covers multi-site managers without requiring an active_establishment_id switch)

DROP POLICY IF EXISTS "establishments_manager" ON public.establishments;

CREATE POLICY "establishments_scoped_manager"
  ON public.establishments
  FOR ALL
  USING (
    owner_id = auth.uid()
    OR id = public.current_establishment_id()
    OR EXISTS (
      SELECT 1 FROM public.user_establishments
      WHERE user_id = auth.uid()
        AND establishment_id = public.establishments.id
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR id = public.current_establishment_id()
    OR EXISTS (
      SELECT 1 FROM public.user_establishments
      WHERE user_id = auth.uid()
        AND establishment_id = public.establishments.id
    )
  );
