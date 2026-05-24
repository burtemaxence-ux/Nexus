-- Add enriched fields to contracts table
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS job_title           TEXT,
  ADD COLUMN IF NOT EXISTS work_location       TEXT,
  ADD COLUMN IF NOT EXISTS cdd_reason          TEXT,
  ADD COLUMN IF NOT EXISTS trial_period_days   INTEGER,
  ADD COLUMN IF NOT EXISTS notice_period_days  INTEGER,
  ADD COLUMN IF NOT EXISTS paid_leave_days     INTEGER DEFAULT 25,
  ADD COLUMN IF NOT EXISTS has_confidentiality BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_non_compete     BOOLEAN NOT NULL DEFAULT FALSE;
