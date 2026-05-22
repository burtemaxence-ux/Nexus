-- Migration 006 : Table des demandes de congés

CREATE TABLE IF NOT EXISTS leave_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('CP', 'RTT', 'maladie', 'sans_solde', 'autre')),
  comment       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  manager_comment TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- L'employé voit uniquement ses propres demandes
CREATE POLICY "Employees can view own leave requests"
  ON leave_requests FOR SELECT
  USING (employee_id = auth.uid());

-- L'employé crée ses propres demandes
CREATE POLICY "Employees can create own leave requests"
  ON leave_requests FOR INSERT
  WITH CHECK (employee_id = auth.uid());

-- L'employé peut annuler ses propres demandes en attente
CREATE POLICY "Employees can delete own pending leave requests"
  ON leave_requests FOR DELETE
  USING (employee_id = auth.uid() AND status = 'pending');

-- Le manager voit toutes les demandes
CREATE POLICY "Managers can view all leave requests"
  ON leave_requests FOR SELECT
  USING (public.is_manager());

-- Le manager peut valider / refuser
CREATE POLICY "Managers can update leave requests"
  ON leave_requests FOR UPDATE
  USING (public.is_manager());
