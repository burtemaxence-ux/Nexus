-- ============================================================
-- 015 — is_manager() helper + performance indexes
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Helper function referenced by many RLS policies.
-- Returns true if the current session belongs to a manager or supervisor.
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('manager', 'supervisor')
  );
$$;

-- Allow any authenticated user to execute it (needed for RLS evaluation)
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;

-- ============================================================
-- Performance indexes
-- ============================================================

-- shifts: most queries filter by date range and employee
CREATE INDEX IF NOT EXISTS idx_shifts_employee_date
  ON public.shifts (employee_id, date);

CREATE INDEX IF NOT EXISTS idx_shifts_date
  ON public.shifts (date);

-- presences: same query patterns as shifts
CREATE INDEX IF NOT EXISTS idx_presences_employee_date
  ON public.presences (employee_id, date);

-- leave_requests: status filter is the most common predicate
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_status
  ON public.leave_requests (employee_id, status);

CREATE INDEX IF NOT EXISTS idx_leave_requests_status_dates
  ON public.leave_requests (status, start_date, end_date);

-- lateness_records: filter by employee + justified flag
CREATE INDEX IF NOT EXISTS idx_lateness_employee_date
  ON public.lateness_records (employee_id, date);

CREATE INDEX IF NOT EXISTS idx_lateness_justified_date
  ON public.lateness_records (justified, date);

-- contracts: filter by employee + expiry date (CDD alert queries)
CREATE INDEX IF NOT EXISTS idx_contracts_employee
  ON public.contracts (employee_id);

CREATE INDEX IF NOT EXISTS idx_contracts_end_date
  ON public.contracts (end_date)
  WHERE end_date IS NOT NULL;

-- availabilities (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'availabilities'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_availabilities_employee
      ON public.availabilities (employee_id)';
  END IF;
END;
$$;
