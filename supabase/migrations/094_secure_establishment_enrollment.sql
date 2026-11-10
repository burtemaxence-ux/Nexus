-- Auth accepts user_metadata from public signup. Only the server can set
-- app_metadata when creating an invited account through the Admin API.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  account auth.users;
  invitation jsonb;
  site_id uuid;
  user_role text;
BEGIN
  -- Auth persists Admin API app_metadata after inserting the account, in the
  -- same transaction. The deferred trigger reads that final row.
  SELECT * INTO account FROM auth.users WHERE id = NEW.id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  invitation := account.raw_app_meta_data->'quartzbase_invitation';

  IF invitation IS NULL THEN
    IF account.raw_user_meta_data ? 'establishment_id' THEN
      RAISE EXCEPTION 'Invitation à un établissement non vérifiée' USING ERRCODE = '42501';
    END IF;
    user_role := 'manager';
    INSERT INTO public.establishments (name, owner_id)
    VALUES ('Mon établissement', account.id)
    RETURNING id INTO site_id;
  ELSE
    user_role := invitation->>'role';
    site_id := (invitation->>'establishment_id')::uuid;
    IF site_id IS NULL OR user_role IS NULL OR user_role NOT IN ('manager', 'supervisor', 'employee') THEN
      RAISE EXCEPTION 'Invitation à un établissement invalide' USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, establishment_id)
  VALUES (
    account.id, account.email,
    COALESCE(account.raw_user_meta_data->>'full_name', account.raw_user_meta_data->>'name', ''),
    user_role, site_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE CONSTRAINT TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles are created by the Auth trigger and removed with the Auth account.
-- Allowing direct delete and insert could bypass the privileged-column guard.
REVOKE INSERT, DELETE, TRUNCATE ON public.profiles FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_delete ON public.profiles;
