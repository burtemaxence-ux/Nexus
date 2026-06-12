-- APPLY MANUALLY in Supabase SQL Editor
-- Separates read (all members) from write (managers only) on settings table
-- Prevents employees from modifying VAPID keys, webhooks, convention collective
DROP POLICY IF EXISTS "settings_establishment" ON public.settings;

CREATE POLICY "settings_read"
ON public.settings FOR SELECT
USING (establishment_id = public.current_establishment_id());

CREATE POLICY "settings_write"
ON public.settings FOR INSERT
WITH CHECK (
  establishment_id = public.current_establishment_id()
  AND public.is_manager()
);

CREATE POLICY "settings_update"
ON public.settings FOR UPDATE
USING (
  establishment_id = public.current_establishment_id()
  AND public.is_manager()
);

CREATE POLICY "settings_delete"
ON public.settings FOR DELETE
USING (
  establishment_id = public.current_establishment_id()
  AND public.is_manager()
);
