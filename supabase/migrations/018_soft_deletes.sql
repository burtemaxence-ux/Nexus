-- ============================================================
-- 018 — Soft deletes on contracts and shifts
-- Records are never physically removed — deleted_at is set instead.
-- All queries filter WHERE deleted_at IS NULL.
-- ============================================================

-- contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_active
  ON public.contracts (employee_id)
  WHERE deleted_at IS NULL;

-- shifts
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_shifts_active
  ON public.shifts (date, employee_id)
  WHERE deleted_at IS NULL;
