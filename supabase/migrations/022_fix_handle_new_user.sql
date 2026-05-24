-- ============================================================
-- 022 — Fix handle_new_user trigger
-- After migration 021, profiles.establishment_id is NOT NULL.
-- The old trigger inserted profiles without establishment_id
-- which causes a constraint violation on every new signup.
--
-- New behavior:
--   • Manager with no establishment → auto-create one
--   • Employee/manager with establishment_id in metadata → use it
--   • Employee without metadata (edge case) → use first establishment
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role             TEXT;
  meta_establishment_id UUID;
BEGIN
  user_role             := COALESCE(NEW.raw_user_meta_data->>'role', 'employee');
  meta_establishment_id := NULLIF(NEW.raw_user_meta_data->>'establishment_id', '')::UUID;

  -- New manager with no establishment: auto-create one named after their email
  IF user_role = 'manager' AND meta_establishment_id IS NULL THEN
    INSERT INTO public.establishments (name, owner_id)
    VALUES ('Mon établissement', NEW.id)
    RETURNING id INTO meta_establishment_id;
  END IF;

  -- Employee invited without establishment_id in metadata (should not happen
  -- after invite route is updated, but kept as a safe fallback)
  IF meta_establishment_id IS NULL THEN
    SELECT id INTO meta_establishment_id FROM public.establishments LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, establishment_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role,
    meta_establishment_id
  );

  RETURN NEW;
END;
$$;
