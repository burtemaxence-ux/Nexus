-- ============================================================
-- 032 — RLS audit : correction employee_documents
-- ============================================================
-- Problème : managers_access_documents était FOR ALL TO authenticated
-- ce qui permettait à tout employé de lire/modifier les documents
-- de ses collègues dans le même établissement.
-- Fix :
--   1. Remplacer par une policy managers-only pour ALL
--   2. Ajouter une policy SELECT pour les employés sur leurs propres docs
-- ============================================================

-- 1. Supprimer l'ancienne policy trop permissive
DROP POLICY IF EXISTS "managers_access_documents" ON public.employee_documents;

-- 2. Managers : accès complet, limité à leur établissement
CREATE POLICY "documents_manager"
  ON public.employee_documents
  FOR ALL
  TO authenticated
  USING (
    public.is_manager()
    AND establishment_id = public.current_establishment_id()
  )
  WITH CHECK (
    public.is_manager()
    AND establishment_id = public.current_establishment_id()
  );

-- 3. Employés : lecture seule sur leurs propres documents
CREATE POLICY "documents_employee_own"
  ON public.employee_documents
  FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    AND establishment_id = public.current_establishment_id()
  );
