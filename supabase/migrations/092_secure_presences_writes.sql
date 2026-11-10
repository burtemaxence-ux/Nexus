-- Les pointages sont créés et modifiés exclusivement par les routes serveur
-- (service role après authentification). Les clients gardent la lecture RLS.
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

