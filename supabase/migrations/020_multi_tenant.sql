-- ============================================================
-- 020 — Multi-tenant : establishment_id sur toutes les tables
-- RLS isolation par établissement
-- ============================================================

-- ── Helper functions ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_establishment_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT establishment_id FROM public.profiles WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.current_establishment_id() TO authenticated;

-- Trigger function: auto-fill establishment_id on INSERT when NULL
CREATE OR REPLACE FUNCTION public.auto_set_establishment_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.establishment_id IS NULL THEN
    NEW.establishment_id := public.current_establishment_id();
  END IF;
  RETURN NEW;
END;
$$;

-- ── Seed: ensure one establishment exists ─────────────────────────────

DO $$
DECLARE est_id UUID;
BEGIN
  SELECT id INTO est_id FROM public.establishments LIMIT 1;

  IF est_id IS NULL THEN
    INSERT INTO public.establishments (name, owner_id)
    VALUES (
      COALESCE(
        (SELECT value FROM public.settings WHERE key = 'establishment_name'),
        'Mon établissement'
      ),
      (SELECT id FROM public.profiles WHERE role = 'manager' ORDER BY created_at LIMIT 1)
    )
    RETURNING id INTO est_id;
  END IF;

  -- Link all existing profiles to this establishment
  UPDATE public.profiles SET establishment_id = est_id WHERE establishment_id IS NULL;
END;
$$;

ALTER TABLE public.profiles
  ALTER COLUMN establishment_id SET NOT NULL;

-- ── shifts ────────────────────────────────────────────────────────────

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.shifts s
SET establishment_id = p.establishment_id
FROM public.profiles p
WHERE p.id = s.employee_id AND s.establishment_id IS NULL;

ALTER TABLE public.shifts ALTER COLUMN establishment_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shifts_establishment ON public.shifts (establishment_id);

CREATE TRIGGER shifts_auto_establishment
  BEFORE INSERT ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── presences ─────────────────────────────────────────────────────────

ALTER TABLE public.presences
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.presences pr
SET establishment_id = p.establishment_id
FROM public.profiles p
WHERE p.id = pr.employee_id AND pr.establishment_id IS NULL;

ALTER TABLE public.presences ALTER COLUMN establishment_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_presences_establishment ON public.presences (establishment_id);

CREATE TRIGGER presences_auto_establishment
  BEFORE INSERT ON public.presences
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── leave_requests ────────────────────────────────────────────────────

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.leave_requests lr
SET establishment_id = p.establishment_id
FROM public.profiles p
WHERE p.id = lr.employee_id AND lr.establishment_id IS NULL;

ALTER TABLE public.leave_requests ALTER COLUMN establishment_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leave_requests_establishment ON public.leave_requests (establishment_id);

CREATE TRIGGER leave_requests_auto_establishment
  BEFORE INSERT ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── contracts ─────────────────────────────────────────────────────────

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.contracts c
SET establishment_id = p.establishment_id
FROM public.profiles p
WHERE p.id = c.employee_id AND c.establishment_id IS NULL;

ALTER TABLE public.contracts ALTER COLUMN establishment_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_establishment ON public.contracts (establishment_id);

CREATE TRIGGER contracts_auto_establishment
  BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── lateness_records ──────────────────────────────────────────────────

ALTER TABLE public.lateness_records
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.lateness_records lr
SET establishment_id = p.establishment_id
FROM public.profiles p
WHERE p.id = lr.employee_id AND lr.establishment_id IS NULL;

ALTER TABLE public.lateness_records ALTER COLUMN establishment_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lateness_establishment ON public.lateness_records (establishment_id);

CREATE TRIGGER lateness_records_auto_establishment
  BEFORE INSERT ON public.lateness_records
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── availabilities ────────────────────────────────────────────────────

ALTER TABLE public.availabilities
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.availabilities a
SET establishment_id = p.establishment_id
FROM public.profiles p
WHERE p.id = a.employee_id AND a.establishment_id IS NULL;

ALTER TABLE public.availabilities ALTER COLUMN establishment_id SET NOT NULL;

CREATE TRIGGER availabilities_auto_establishment
  BEFORE INSERT ON public.availabilities
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── postes ────────────────────────────────────────────────────────────

ALTER TABLE public.postes
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.postes
SET establishment_id = (SELECT id FROM public.establishments LIMIT 1)
WHERE establishment_id IS NULL;

ALTER TABLE public.postes ALTER COLUMN establishment_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_postes_establishment ON public.postes (establishment_id);

CREATE TRIGGER postes_auto_establishment
  BEFORE INSERT ON public.postes
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── settings (key TEXT PRIMARY KEY → (establishment_id, key)) ─────────

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.settings
SET establishment_id = (SELECT id FROM public.establishments LIMIT 1)
WHERE establishment_id IS NULL;

ALTER TABLE public.settings ALTER COLUMN establishment_id SET NOT NULL;

ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE public.settings ADD PRIMARY KEY (establishment_id, key);

CREATE TRIGGER settings_auto_establishment
  BEFORE INSERT ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── week_status (week_monday PK → (establishment_id, week_monday)) ────

ALTER TABLE public.week_status
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.week_status
SET establishment_id = (SELECT id FROM public.establishments LIMIT 1)
WHERE establishment_id IS NULL;

ALTER TABLE public.week_status ALTER COLUMN establishment_id SET NOT NULL;

ALTER TABLE public.week_status DROP CONSTRAINT IF EXISTS week_status_pkey;
ALTER TABLE public.week_status ADD PRIMARY KEY (establishment_id, week_monday);

CREATE TRIGGER week_status_auto_establishment
  BEFORE INSERT ON public.week_status
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── audit_log — add establishment_id + update trigger ─────────────────

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.audit_log
SET establishment_id = (SELECT id FROM public.establishments LIMIT 1)
WHERE establishment_id IS NULL;

-- Rebuild the audit trigger to capture establishment_id automatically
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec_establishment_id UUID;
BEGIN
  rec_establishment_id := CASE
    WHEN TG_OP = 'DELETE' AND TG_TABLE_NAME != 'profiles' THEN
      (CASE TG_TABLE_NAME
        WHEN 'contracts'        THEN OLD.establishment_id
        WHEN 'leave_requests'   THEN OLD.establishment_id
        WHEN 'lateness_records' THEN OLD.establishment_id
        ELSE NULL
      END)
    ELSE
      (CASE TG_TABLE_NAME
        WHEN 'contracts'        THEN NEW.establishment_id
        WHEN 'leave_requests'   THEN NEW.establishment_id
        WHEN 'lateness_records' THEN NEW.establishment_id
        WHEN 'profiles'         THEN COALESCE(NEW.establishment_id, OLD.establishment_id)
        ELSE NULL
      END)
  END;

  IF rec_establishment_id IS NULL THEN
    rec_establishment_id := public.current_establishment_id();
  END IF;

  INSERT INTO public.audit_log
    (table_name, record_id, action, old_data, new_data, performed_by, establishment_id)
  VALUES (
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid(),
    rec_establishment_id
  );
  RETURN NULL;
END;
$$;

-- ── RLS — drop old policies, create establishment-scoped ones ─────────

-- profiles
DROP POLICY IF EXISTS "Managers can view all profiles"        ON public.profiles;
DROP POLICY IF EXISTS "Managers can update all profiles"      ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"            ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"          ON public.profiles;

CREATE POLICY "profiles_self"
  ON public.profiles FOR ALL
  USING (id = auth.uid());

CREATE POLICY "profiles_manager_establishment"
  ON public.profiles FOR ALL
  USING (
    public.is_manager()
    AND establishment_id = public.current_establishment_id()
  );

-- shifts
DROP POLICY IF EXISTS "Managers can manage all shifts"  ON public.shifts;
DROP POLICY IF EXISTS "Employees can view own shifts"   ON public.shifts;

CREATE POLICY "shifts_manager"
  ON public.shifts FOR ALL
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());

CREATE POLICY "shifts_employee_own"
  ON public.shifts FOR SELECT
  USING (establishment_id = public.current_establishment_id() AND employee_id = auth.uid());

-- presences
DROP POLICY IF EXISTS "Managers can view all presences"   ON public.presences;
DROP POLICY IF EXISTS "Employees can view own presences"  ON public.presences;
DROP POLICY IF EXISTS "Employees can insert own presence" ON public.presences;
DROP POLICY IF EXISTS "Employees can update own presence" ON public.presences;

CREATE POLICY "presences_manager"
  ON public.presences FOR ALL
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());

CREATE POLICY "presences_employee_own"
  ON public.presences FOR ALL
  USING (establishment_id = public.current_establishment_id() AND employee_id = auth.uid());

-- leave_requests
DROP POLICY IF EXISTS "Managers can view all leave requests"          ON public.leave_requests;
DROP POLICY IF EXISTS "Managers can update leave requests"            ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can view own leave requests"         ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can create own leave requests"       ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can delete own pending leave requests" ON public.leave_requests;

CREATE POLICY "leave_manager"
  ON public.leave_requests FOR ALL
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());

CREATE POLICY "leave_employee_select"
  ON public.leave_requests FOR SELECT
  USING (establishment_id = public.current_establishment_id() AND employee_id = auth.uid());

CREATE POLICY "leave_employee_insert"
  ON public.leave_requests FOR INSERT
  WITH CHECK (establishment_id = public.current_establishment_id() AND employee_id = auth.uid());

CREATE POLICY "leave_employee_cancel"
  ON public.leave_requests FOR DELETE
  USING (establishment_id = public.current_establishment_id() AND employee_id = auth.uid() AND status = 'pending');

-- contracts
DROP POLICY IF EXISTS "Managers can manage contracts"  ON public.contracts;
DROP POLICY IF EXISTS "Employees can view own contracts" ON public.contracts;

CREATE POLICY "contracts_manager"
  ON public.contracts FOR ALL
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());

CREATE POLICY "contracts_employee_own"
  ON public.contracts FOR SELECT
  USING (establishment_id = public.current_establishment_id() AND employee_id = auth.uid());

-- lateness_records
DROP POLICY IF EXISTS "Managers can manage lateness records"      ON public.lateness_records;
DROP POLICY IF EXISTS "Employees can view own lateness records"   ON public.lateness_records;

CREATE POLICY "lateness_manager"
  ON public.lateness_records FOR ALL
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());

CREATE POLICY "lateness_employee_own"
  ON public.lateness_records FOR SELECT
  USING (establishment_id = public.current_establishment_id() AND employee_id = auth.uid());

-- availabilities
DROP POLICY IF EXISTS "Managers can manage availabilities"       ON public.availabilities;
DROP POLICY IF EXISTS "Employees can manage own availabilities"  ON public.availabilities;

CREATE POLICY "availabilities_manager"
  ON public.availabilities FOR ALL
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());

CREATE POLICY "availabilities_employee_own"
  ON public.availabilities FOR ALL
  USING (establishment_id = public.current_establishment_id() AND employee_id = auth.uid());

-- postes
DROP POLICY IF EXISTS "Managers can manage postes"  ON public.postes;
DROP POLICY IF EXISTS "Employees can view postes"   ON public.postes;

CREATE POLICY "postes_manager"
  ON public.postes FOR ALL
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());

CREATE POLICY "postes_employee_view"
  ON public.postes FOR SELECT
  USING (establishment_id = public.current_establishment_id() AND auth.uid() IS NOT NULL);

-- settings
DROP POLICY IF EXISTS "settings_read_all"     ON public.settings;
DROP POLICY IF EXISTS "settings_manager_write" ON public.settings;

CREATE POLICY "settings_establishment"
  ON public.settings FOR ALL
  USING (establishment_id = public.current_establishment_id());

-- week_status
DROP POLICY IF EXISTS "Managers can manage week_status"  ON public.week_status;
DROP POLICY IF EXISTS "Employees can view week_status"   ON public.week_status;

CREATE POLICY "week_status_manager"
  ON public.week_status FOR ALL
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());

CREATE POLICY "week_status_employee_view"
  ON public.week_status FOR SELECT
  USING (establishment_id = public.current_establishment_id() AND auth.uid() IS NOT NULL);

-- audit_log
DROP POLICY IF EXISTS "Managers can view audit log"            ON public.audit_log;
DROP POLICY IF EXISTS "Managers can view audit log" ON public.audit_log;

CREATE POLICY "audit_log_manager"
  ON public.audit_log FOR SELECT
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());
