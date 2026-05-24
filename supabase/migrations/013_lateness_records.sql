CREATE TABLE IF NOT EXISTS public.lateness_records (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date           DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  actual_time    TIMESTAMPTZ NOT NULL,
  late_minutes   INTEGER NOT NULL CHECK (late_minutes > 0),
  justified      BOOLEAN NOT NULL DEFAULT FALSE,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, date)
);

ALTER TABLE public.lateness_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage lateness records"
  ON public.lateness_records FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'supervisor'))
  );

CREATE POLICY "Employees can view own lateness records"
  ON public.lateness_records FOR SELECT
  USING (employee_id = auth.uid());
