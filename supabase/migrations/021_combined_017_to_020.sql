-- ============================================================
-- 021 — Combined fix: covers 017, 018, 019, 020
-- Safe to run even if some of those were never applied.
-- All DDL uses IF NOT EXISTS / OR REPLACE.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- PART 1 — Audit log (017)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.audit_log (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_name   TEXT        NOT NULL,
  record_id    UUID,
  action       TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data     JSONB,
  new_data     JSONB,
  performed_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record
  ON public.audit_log (table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by
  ON public.audit_log (performed_by);

-- ══════════════════════════════════════════════════════════════
-- PART 2 — Soft deletes (018)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_active
  ON public.contracts (employee_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_shifts_active
  ON public.shifts (date, employee_id)
  WHERE deleted_at IS NULL;

-- ══════════════════════════════════════════════════════════════
-- PART 3 — Establishments + profiles.establishment_id (019)
-- MUST come before current_establishment_id() function
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.establishments (
  id         UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT        NOT NULL,
  owner_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  plan       TEXT        NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

-- Add establishment_id to profiles as nullable first (required before seeding)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS establishment_id UUID
  REFERENCES public.establishments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_establishment_id
  ON public.profiles (establishment_id)
  WHERE establishment_id IS NOT NULL;

-- updated_at trigger for establishments
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS establishments_updated_at ON public.establishments;
CREATE TRIGGER establishments_updated_at
  BEFORE UPDATE ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ══════════════════════════════════════════════════════════════
-- PART 4 — Multi-tenant helpers (020)
-- profiles.establishment_id now exists — safe to reference
-- ══════════════════════════════════════════════════════════════

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

-- ══════════════════════════════════════════════════════════════
-- PART 5 — Seed: ensure one establishment, link all profiles
-- ══════════════════════════════════════════════════════════════

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

-- RLS on establishments (requires current_establishment_id)
DROP POLICY IF EXISTS "Managers can manage their establishment" ON public.establishments;
CREATE POLICY "establishments_manager"
  ON public.establishments FOR ALL
  USING (owner_id = auth.uid() OR public.is_manager());

-- ══════════════════════════════════════════════════════════════
-- PART 6 — Add establishment_id to all tables + triggers
-- ══════════════════════════════════════════════════════════════

-- ── shifts ───────────────────────────────────────────────────

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.shifts s
SET establishment_id = p.establishment_id
FROM public.profiles p
WHERE p.id = s.employee_id AND s.establishment_id IS NULL;

ALTER TABLE public.shifts ALTER COLUMN establishment_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shifts_establishment ON public.shifts (establishment_id);

DROP TRIGGER IF EXISTS shifts_auto_establishment ON public.shifts;
CREATE TRIGGER shifts_auto_establishment
  BEFORE INSERT ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── presences ────────────────────────────────────────────────

ALTER TABLE public.presences
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.presences pr
SET establishment_id = p.establishment_id
FROM public.profiles p
WHERE p.id = pr.employee_id AND pr.establishment_id IS NULL;

ALTER TABLE public.presences ALTER COLUMN establishment_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_presences_establishment ON public.presences (establishment_id);

DROP TRIGGER IF EXISTS presences_auto_establishment ON public.presences;
CREATE TRIGGER presences_auto_establishment
  BEFORE INSERT ON public.presences
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── leave_requests ───────────────────────────────────────────

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.leave_requests lr
SET establishment_id = p.establishment_id
FROM public.profiles p
WHERE p.id = lr.employee_id AND lr.establishment_id IS NULL;

ALTER TABLE public.leave_requests ALTER COLUMN establishment_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leave_requests_establishment ON public.leave_requests (establishment_id);

DROP TRIGGER IF EXISTS leave_requests_auto_establishment ON public.leave_requests;
CREATE TRIGGER leave_requests_auto_establishment
  BEFORE INSERT ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── contracts ────────────────────────────────────────────────

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.contracts c
SET establishment_id = p.establishment_id
FROM public.profiles p
WHERE p.id = c.employee_id AND c.establishment_id IS NULL;

ALTER TABLE public.contracts ALTER COLUMN establishment_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_establishment ON public.contracts (establishment_id);

DROP TRIGGER IF EXISTS contracts_auto_establishment ON public.contracts;
CREATE TRIGGER contracts_auto_establishment
  BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── lateness_records ─────────────────────────────────────────

ALTER TABLE public.lateness_records
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.lateness_records lr
SET establishment_id = p.establishment_id
FROM public.profiles p
WHERE p.id = lr.employee_id AND lr.establishment_id IS NULL;

ALTER TABLE public.lateness_records ALTER COLUMN establishment_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lateness_establishment ON public.lateness_records (establishment_id);

DROP TRIGGER IF EXISTS lateness_records_auto_establishment ON public.lateness_records;
CREATE TRIGGER lateness_records_auto_establishment
  BEFORE INSERT ON public.lateness_records
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── availabilities ───────────────────────────────────────────

ALTER TABLE public.availabilities
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.availabilities a
SET establishment_id = p.establishment_id
FROM public.profiles p
WHERE p.id = a.employee_id AND a.establishment_id IS NULL;

ALTER TABLE public.availabilities ALTER COLUMN establishment_id SET NOT NULL;

DROP TRIGGER IF EXISTS availabilities_auto_establishment ON public.availabilities;
CREATE TRIGGER availabilities_auto_establishment
  BEFORE INSERT ON public.availabilities
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── postes ───────────────────────────────────────────────────

ALTER TABLE public.postes
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.postes
SET establishment_id = (SELECT id FROM public.establishments LIMIT 1)
WHERE establishment_id IS NULL;

ALTER TABLE public.postes ALTER COLUMN establishment_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_postes_establishment ON public.postes (establishment_id);

DROP TRIGGER IF EXISTS postes_auto_establishment ON public.postes;
CREATE TRIGGER postes_auto_establishment
  BEFORE INSERT ON public.postes
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── settings ─────────────────────────────────────────────────

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.settings
SET establishment_id = (SELECT id FROM public.establishments LIMIT 1)
WHERE establishment_id IS NULL;

ALTER TABLE public.settings ALTER COLUMN establishment_id SET NOT NULL;

ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE public.settings ADD PRIMARY KEY (establishment_id, key);

DROP TRIGGER IF EXISTS settings_auto_establishment ON public.settings;
CREATE TRIGGER settings_auto_establishment
  BEFORE INSERT ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── week_status ──────────────────────────────────────────────

ALTER TABLE public.week_status
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.week_status
SET establishment_id = (SELECT id FROM public.establishments LIMIT 1)
WHERE establishment_id IS NULL;

ALTER TABLE public.week_status ALTER COLUMN establishment_id SET NOT NULL;

ALTER TABLE public.week_status DROP CONSTRAINT IF EXISTS week_status_pkey;
ALTER TABLE public.week_status ADD PRIMARY KEY (establishment_id, week_monday);

DROP TRIGGER IF EXISTS week_status_auto_establishment ON public.week_status;
CREATE TRIGGER week_status_auto_establishment
  BEFORE INSERT ON public.week_status
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_establishment_id();

-- ── audit_log — add establishment_id column ──────────────────

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id);

UPDATE public.audit_log
SET establishment_id = (SELECT id FROM public.establishments LIMIT 1)
WHERE establishment_id IS NULL;

-- ══════════════════════════════════════════════════════════════
-- PART 7 — Rebuild audit trigger with establishment_id (020)
-- ══════════════════════════════════════════════════════════════

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

-- Create audit triggers (only if they don't exist yet)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_contracts') THEN
    CREATE TRIGGER audit_contracts
      AFTER INSERT OR UPDATE OR DELETE ON public.contracts
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_leave_requests') THEN
    CREATE TRIGGER audit_leave_requests
      AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_profiles') THEN
    CREATE TRIGGER audit_profiles
      AFTER UPDATE OR DELETE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_lateness_records') THEN
    CREATE TRIGGER audit_lateness_records
      AFTER INSERT OR UPDATE OR DELETE ON public.lateness_records
      FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
  END IF;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- PART 8 — RLS: drop old policies, create establishment-scoped
-- ══════════════════════════════════════════════════════════════

-- profiles
DROP POLICY IF EXISTS "Managers can view all profiles"        ON public.profiles;
DROP POLICY IF EXISTS "Managers can update all profiles"      ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"            ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"          ON public.profiles;
DROP POLICY IF EXISTS "profiles_self"                         ON public.profiles;
DROP POLICY IF EXISTS "profiles_manager_establishment"        ON public.profiles;

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
DROP POLICY IF EXISTS "shifts_manager"                  ON public.shifts;
DROP POLICY IF EXISTS "shifts_employee_own"             ON public.shifts;

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
DROP POLICY IF EXISTS "presences_manager"                 ON public.presences;
DROP POLICY IF EXISTS "presences_employee_own"            ON public.presences;

CREATE POLICY "presences_manager"
  ON public.presences FOR ALL
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());

CREATE POLICY "presences_employee_own"
  ON public.presences FOR ALL
  USING (establishment_id = public.current_establishment_id() AND employee_id = auth.uid());

-- leave_requests
DROP POLICY IF EXISTS "Managers can view all leave requests"            ON public.leave_requests;
DROP POLICY IF EXISTS "Managers can update leave requests"              ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can view own leave requests"           ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can create own leave requests"         ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can delete own pending leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_manager"                                   ON public.leave_requests;
DROP POLICY IF EXISTS "leave_employee_select"                           ON public.leave_requests;
DROP POLICY IF EXISTS "leave_employee_insert"                           ON public.leave_requests;
DROP POLICY IF EXISTS "leave_employee_cancel"                           ON public.leave_requests;

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
DROP POLICY IF EXISTS "Managers can manage contracts"    ON public.contracts;
DROP POLICY IF EXISTS "Employees can view own contracts" ON public.contracts;
DROP POLICY IF EXISTS "contracts_manager"                ON public.contracts;
DROP POLICY IF EXISTS "contracts_employee_own"           ON public.contracts;

CREATE POLICY "contracts_manager"
  ON public.contracts FOR ALL
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());

CREATE POLICY "contracts_employee_own"
  ON public.contracts FOR SELECT
  USING (establishment_id = public.current_establishment_id() AND employee_id = auth.uid());

-- lateness_records
DROP POLICY IF EXISTS "Managers can manage lateness records"    ON public.lateness_records;
DROP POLICY IF EXISTS "Employees can view own lateness records" ON public.lateness_records;
DROP POLICY IF EXISTS "lateness_manager"                        ON public.lateness_records;
DROP POLICY IF EXISTS "lateness_employee_own"                   ON public.lateness_records;

CREATE POLICY "lateness_manager"
  ON public.lateness_records FOR ALL
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());

CREATE POLICY "lateness_employee_own"
  ON public.lateness_records FOR SELECT
  USING (establishment_id = public.current_establishment_id() AND employee_id = auth.uid());

-- availabilities
DROP POLICY IF EXISTS "Managers can manage availabilities"      ON public.availabilities;
DROP POLICY IF EXISTS "Employees can manage own availabilities" ON public.availabilities;
DROP POLICY IF EXISTS "availabilities_manager"                  ON public.availabilities;
DROP POLICY IF EXISTS "availabilities_employee_own"             ON public.availabilities;

CREATE POLICY "availabilities_manager"
  ON public.availabilities FOR ALL
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());

CREATE POLICY "availabilities_employee_own"
  ON public.availabilities FOR ALL
  USING (establishment_id = public.current_establishment_id() AND employee_id = auth.uid());

-- postes
DROP POLICY IF EXISTS "Managers can manage postes" ON public.postes;
DROP POLICY IF EXISTS "Employees can view postes"  ON public.postes;
DROP POLICY IF EXISTS "postes_manager"             ON public.postes;
DROP POLICY IF EXISTS "postes_employee_view"       ON public.postes;

CREATE POLICY "postes_manager"
  ON public.postes FOR ALL
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());

CREATE POLICY "postes_employee_view"
  ON public.postes FOR SELECT
  USING (establishment_id = public.current_establishment_id() AND auth.uid() IS NOT NULL);

-- settings
DROP POLICY IF EXISTS "settings_read_all"          ON public.settings;
DROP POLICY IF EXISTS "settings_manager_write"     ON public.settings;
DROP POLICY IF EXISTS "settings_establishment"     ON public.settings;

CREATE POLICY "settings_establishment"
  ON public.settings FOR ALL
  USING (establishment_id = public.current_establishment_id());

-- week_status
DROP POLICY IF EXISTS "Managers can manage week_status" ON public.week_status;
DROP POLICY IF EXISTS "Employees can view week_status"  ON public.week_status;
DROP POLICY IF EXISTS "week_status_manager"             ON public.week_status;
DROP POLICY IF EXISTS "week_status_employee_view"       ON public.week_status;

CREATE POLICY "week_status_manager"
  ON public.week_status FOR ALL
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());

CREATE POLICY "week_status_employee_view"
  ON public.week_status FOR SELECT
  USING (establishment_id = public.current_establishment_id() AND auth.uid() IS NOT NULL);

-- audit_log
DROP POLICY IF EXISTS "Managers can view audit log" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_manager"           ON public.audit_log;

CREATE POLICY "audit_log_manager"
  ON public.audit_log FOR SELECT
  USING (establishment_id = public.current_establishment_id() AND public.is_manager());
