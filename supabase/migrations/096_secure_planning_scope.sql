-- A shift and the employee and position referenced by it belong to one site.
ALTER POLICY shifts_insert ON public.shifts WITH CHECK (
  establishment_id = (SELECT public.current_establishment_id())
  AND (SELECT public.is_manager())
  AND EXISTS (SELECT 1 FROM public.profiles employee
    WHERE employee.id = shifts.employee_id AND employee.establishment_id = shifts.establishment_id)
  AND (poste_id IS NULL OR EXISTS (SELECT 1 FROM public.postes poste
    WHERE poste.id = shifts.poste_id AND poste.establishment_id = shifts.establishment_id))
);

ALTER POLICY shifts_update ON public.shifts WITH CHECK (
  establishment_id = (SELECT public.current_establishment_id())
  AND (SELECT public.is_manager())
  AND EXISTS (SELECT 1 FROM public.profiles employee
    WHERE employee.id = shifts.employee_id AND employee.establishment_id = shifts.establishment_id)
  AND (poste_id IS NULL OR EXISTS (SELECT 1 FROM public.postes poste
    WHERE poste.id = shifts.poste_id AND poste.establishment_id = shifts.establishment_id))
);
