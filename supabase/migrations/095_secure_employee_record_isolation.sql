-- The existing establishment predicates also have to match the employee
-- referenced by a new or updated record.
ALTER POLICY contracts_insert ON public.contracts WITH CHECK (
  establishment_id = (SELECT public.current_establishment_id())
  AND (SELECT public.is_manager())
  AND EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id = contracts.employee_id AND p.establishment_id = contracts.establishment_id)
);
ALTER POLICY contracts_update ON public.contracts WITH CHECK (
  establishment_id = (SELECT public.current_establishment_id())
  AND (SELECT public.is_manager())
  AND EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id = contracts.employee_id AND p.establishment_id = contracts.establishment_id)
);

ALTER POLICY employee_documents_insert ON public.employee_documents WITH CHECK (
  establishment_id = (SELECT public.current_establishment_id())
  AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'manager'
  AND EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id = employee_documents.employee_id AND p.establishment_id = employee_documents.establishment_id)
);
ALTER POLICY employee_documents_update ON public.employee_documents
  USING (establishment_id = (SELECT public.current_establishment_id())
    AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'manager')
  WITH CHECK (
    establishment_id = (SELECT public.current_establishment_id())
    AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'manager'
    AND EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = employee_documents.employee_id AND p.establishment_id = employee_documents.establishment_id)
  );
ALTER POLICY employee_documents_delete ON public.employee_documents USING (
  establishment_id = (SELECT public.current_establishment_id())
  AND (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'manager'
);

ALTER TABLE public.employee_documents
  ADD CONSTRAINT employee_documents_scoped_path CHECK (
    split_part(file_path, '/', 1) = establishment_id::text
    AND split_part(file_path, '/', 2) = employee_id::text
    AND split_part(file_path, '/', 3) ~ '^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$'
    AND length(file_path) - length(replace(file_path, '/', '')) = 2
  ) NOT VALID;

-- Deploy the scoped document routes before applying this policy in production.
-- A restrictive policy also limits access granted by existing permissive policies.
CREATE POLICY employee_documents_server_only ON storage.objects
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (bucket_id IS DISTINCT FROM 'employee-documents')
  WITH CHECK (bucket_id IS DISTINCT FROM 'employee-documents');
