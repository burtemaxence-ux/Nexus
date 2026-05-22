CREATE TABLE IF NOT EXISTS presences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in    TIMESTAMPTZ,
  clock_out   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

ALTER TABLE presences ENABLE ROW LEVEL SECURITY;

-- Employees: read & upsert their own row
CREATE POLICY "Employees can view own presences"
  ON presences FOR SELECT
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can insert own presence"
  ON presences FOR INSERT
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update own presence"
  ON presences FOR UPDATE
  USING (employee_id = auth.uid());

-- Managers: read all
CREATE POLICY "Managers can view all presences"
  ON presences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'
    )
  );
