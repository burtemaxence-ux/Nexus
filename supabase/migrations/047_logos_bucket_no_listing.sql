-- 047 — Prevent listing of the public `logos` bucket (Supabase advisor 0025)
-- The bucket is public, so objects remain accessible by URL through the public
-- CDN without any SELECT policy. The broad SELECT policy only enabled clients to
-- enumerate every file in the bucket. The app uploads via logos_manager_upload
-- and references logos via getPublicUrl (a URL string, no list call), so removing
-- the read policy is safe.
DROP POLICY IF EXISTS "logos_public_read" ON storage.objects;
