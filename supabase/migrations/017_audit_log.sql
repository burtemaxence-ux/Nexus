-- ============================================================
-- 017 — Audit log
-- Tracks INSERT / UPDATE / DELETE on key business tables.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_name  TEXT        NOT NULL,
  record_id   UUID,
  action      TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  performed_by UUID       REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view audit log"
  ON public.audit_log FOR SELECT
  USING (public.is_manager());

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record
  ON public.audit_log (table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by
  ON public.audit_log (performed_by);

-- ── Trigger function ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, performed_by)
  VALUES (
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid()   -- NULL when called via service-role key (expected)
  );
  RETURN NULL;  -- AFTER trigger: return value is ignored
END;
$$;

-- ── Triggers ──────────────────────────────────────────────────────────────────

CREATE TRIGGER audit_contracts
  AFTER INSERT OR UPDATE OR DELETE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_leave_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Profile changes (no INSERT — that's handled by auth trigger)
CREATE TRIGGER audit_profiles
  AFTER UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_lateness_records
  AFTER INSERT OR UPDATE OR DELETE ON public.lateness_records
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
