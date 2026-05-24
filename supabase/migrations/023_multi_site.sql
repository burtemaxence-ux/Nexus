-- 023_multi_site.sql
-- Phase 5: Multi-site support
-- Adds active_establishment_id to profiles, updates current_establishment_id(),
-- and creates user_establishments table for multi-site membership.

-- 1. Add active_establishment_id to profiles (nullable — NULL means use default establishment_id)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_establishment_id UUID REFERENCES public.establishments(id);

-- 2. Update current_establishment_id() to respect active_establishment_id
CREATE OR REPLACE FUNCTION public.current_establishment_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(active_establishment_id, establishment_id)
  FROM public.profiles
  WHERE id = auth.uid()
$$;

-- 3. Create user_establishments table (maps users to their accessible establishments)
CREATE TABLE IF NOT EXISTS public.user_establishments (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  establishment_id UUID        NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  role             TEXT        NOT NULL DEFAULT 'manager' CHECK (role IN ('manager', 'supervisor')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, establishment_id)
);

ALTER TABLE public.user_establishments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_see_own_establishments"          ON public.user_establishments;
DROP POLICY IF EXISTS "managers_manage_establishment_memberships" ON public.user_establishments;

-- Users can read their own memberships
CREATE POLICY "users_see_own_establishments" ON public.user_establishments
  FOR SELECT USING (user_id = auth.uid());

-- Managers can insert/update memberships (for adding sites)
CREATE POLICY "managers_manage_establishment_memberships" ON public.user_establishments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- 4. Seed user_establishments from existing profiles
--    Each existing manager/supervisor gets an entry for their current establishment.
INSERT INTO public.user_establishments (user_id, establishment_id, role)
SELECT id, establishment_id, role
FROM public.profiles
WHERE role IN ('manager', 'supervisor')
  AND establishment_id IS NOT NULL
ON CONFLICT (user_id, establishment_id) DO NOTHING;
