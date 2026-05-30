-- Performance indexes for marketplace_applications
-- lateness_records(employee_id, created_at) already covered by idx_lateness_employee_date

CREATE INDEX IF NOT EXISTS idx_marketplace_applications_employee_created
  ON public.marketplace_applications (employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_applications_slot_status
  ON public.marketplace_applications (slot_id, status);

CREATE INDEX IF NOT EXISTS idx_compliance_alerts_establishment_status
  ON public.compliance_alerts (establishment_id, status)
  WHERE status = 'active';
