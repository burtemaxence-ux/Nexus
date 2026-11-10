-- Les pointages sont créés et modifiés exclusivement par les routes serveur
-- (service role après authentification). Les clients gardent la lecture RLS.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.presences FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Employees can insert own presence" ON public.presences;
DROP POLICY IF EXISTS "Employees can update own presence" ON public.presences;
DROP POLICY IF EXISTS "Employees can view own presences" ON public.presences;
DROP POLICY IF EXISTS "Managers can view all presences" ON public.presences;
DROP POLICY IF EXISTS presences_insert ON public.presences;
DROP POLICY IF EXISTS presences_update ON public.presences;
DROP POLICY IF EXISTS presences_delete ON public.presences;

-- Une ancienne installation peut encore posséder les policies FOR ALL.
DROP POLICY IF EXISTS presences_employee_own ON public.presences;
DROP POLICY IF EXISTS presences_manager ON public.presences;

-- Conserver la lecture limitée à l'établissement et au salarié/manager.
DROP POLICY IF EXISTS presences_select ON public.presences;
CREATE POLICY presences_select ON public.presences FOR SELECT TO authenticated
  USING (establishment_id = (SELECT public.current_establishment_id())
    AND (employee_id = (SELECT auth.uid()) OR (SELECT public.is_manager())));

-- The site's switch endpoint verifies membership before setting the active
-- site. A direct profile update must not bypass that check or the read policy.
CREATE OR REPLACE FUNCTION public.guard_profiles_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND (NEW.role IS DISTINCT FROM OLD.role
          OR NEW.establishment_id IS DISTINCT FROM OLD.establishment_id
          OR NEW.active_establishment_id IS DISTINCT FROM OLD.active_establishment_id) THEN
    RAISE EXCEPTION 'Modification des champs privilégiés du profil non autorisée'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profiles_privileged_columns ON public.profiles;
CREATE TRIGGER guard_profiles_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_privileged_columns();
