-- APPLY MANUALLY in Supabase SQL Editor
-- Restricts logo upload/update/delete to managers only (was: any authenticated user)
DROP POLICY IF EXISTS "logos_manager_upload" ON storage.objects;
DROP POLICY IF EXISTS "logos_manager_update" ON storage.objects;
DROP POLICY IF EXISTS "logos_manager_delete" ON storage.objects;

CREATE POLICY "logos_manager_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos'
  AND auth.role() = 'authenticated'
  AND public.is_manager()
);

CREATE POLICY "logos_manager_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'logos'
  AND auth.role() = 'authenticated'
  AND public.is_manager()
);

CREATE POLICY "logos_manager_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos'
  AND auth.role() = 'authenticated'
  AND public.is_manager()
);
