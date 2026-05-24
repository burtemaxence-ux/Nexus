-- Add first_name and last_name columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Extend role check constraint to include supervisor
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('manager', 'employee', 'supervisor'));

-- Update trigger to populate first_name / last_name and compute full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  fn TEXT;
  ln TEXT;
  computed_name TEXT;
BEGIN
  fn := NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'first_name', '')), '');
  ln := NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'last_name',  '')), '');
  computed_name := COALESCE(
    NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'full_name', '')), ''),
    NULLIF(TRIM(COALESCE(fn, '') || ' ' || COALESCE(ln, '')), ''),
    ''
  );

  INSERT INTO public.profiles (id, email, full_name, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    computed_name,
    fn,
    ln,
    COALESCE(new.raw_user_meta_data->>'role', 'employee')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow managers to update any profile (needed for enriching invited profiles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'Managers can update all profiles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Managers can update all profiles"
        ON public.profiles FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'manager'
          )
        )
    $policy$;
  END IF;
END $$;
