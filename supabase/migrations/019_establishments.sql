-- ============================================================
-- 019 — Establishments foundation
-- Creates the establishments table and links profiles to it.
-- Does NOT migrate existing queries — this is the structural
-- foundation for future multi-tenant support.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.establishments (
  id         UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT    NOT NULL,
  owner_id   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  plan       TEXT    NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage their establishment"
  ON public.establishments FOR ALL
  USING (owner_id = auth.uid() OR public.is_manager());

-- Link profiles to an establishment (nullable for backwards compatibility)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS establishment_id UUID
  REFERENCES public.establishments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_establishment_id
  ON public.profiles (establishment_id)
  WHERE establishment_id IS NOT NULL;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER establishments_updated_at
  BEFORE UPDATE ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
