ALTER TABLE presences
  ADD COLUMN IF NOT EXISTS break_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS break_end   TIMESTAMPTZ;

-- Allow employees to update break columns on their own row
DROP POLICY IF EXISTS "Employees can update own presence" ON presences;
CREATE POLICY "Employees can update own presence"
  ON presences FOR UPDATE
  USING (employee_id = auth.uid());
