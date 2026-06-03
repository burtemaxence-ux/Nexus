-- 037 — Fix RLS replacement_requests
-- La table n'a pas de colonne requester_id ; les policies utilisent
-- absent_employee_id / candidates JSONB. On recrée les policies proprement.

DROP POLICY IF EXISTS "Managers manage replacement requests"       ON public.replacement_requests;
DROP POLICY IF EXISTS "Employees read own candidate requests"      ON public.replacement_requests;
DROP POLICY IF EXISTS "replacement_requests_manager"              ON public.replacement_requests;
DROP POLICY IF EXISTS "replacement_requests_employee_read"        ON public.replacement_requests;

-- Managers/superviseurs : accès complet aux demandes de leur établissement
CREATE POLICY "replacement_requests_manager"
  ON public.replacement_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'supervisor')
        AND (p.establishment_id = replacement_requests.establishment_id
          OR p.active_establishment_id = replacement_requests.establishment_id)
    )
  );

-- Employés : lecture uniquement des demandes où ils figurent dans candidates
CREATE POLICY "replacement_requests_employee_read"
  ON public.replacement_requests FOR SELECT
  TO authenticated
  USING (
    candidates @> jsonb_build_array(
      jsonb_build_object('employee_id', auth.uid()::text)
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'employee'
    )
  );
