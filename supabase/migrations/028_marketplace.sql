-- 028 — Marketplace de remplaçants

CREATE TABLE IF NOT EXISTS public.marketplace_slots (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shift_id         UUID REFERENCES public.shifts(id) ON DELETE CASCADE NOT NULL,
  establishment_id UUID NOT NULL,
  created_by       UUID REFERENCES public.profiles(id) NOT NULL,
  reason           TEXT,
  expires_at       TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'filled', 'expired', 'cancelled')),
  filled_by        UUID REFERENCES public.profiles(id),
  filled_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- One active slot per shift at a time
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_slot_open_unique
  ON public.marketplace_slots(shift_id) WHERE (status = 'open');

CREATE TABLE IF NOT EXISTS public.marketplace_applications (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slot_id     UUID REFERENCES public.marketplace_slots(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slot_id, employee_id)
);

ALTER TABLE public.marketplace_slots        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_applications ENABLE ROW LEVEL SECURITY;

-- Managers: full access to their establishment's slots
CREATE POLICY "Managers manage marketplace slots"
  ON public.marketplace_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'supervisor')
        AND (p.establishment_id = marketplace_slots.establishment_id
          OR p.active_establishment_id = marketplace_slots.establishment_id)
    )
  );

-- Employees: read open slots for their establishment
CREATE POLICY "Employees read open slots"
  ON public.marketplace_slots FOR SELECT
  USING (
    status = 'open'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'employee'
        AND p.establishment_id = marketplace_slots.establishment_id
    )
  );

-- Managers: full access to applications in their establishment
CREATE POLICY "Managers manage marketplace applications"
  ON public.marketplace_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_slots ms
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE ms.id = marketplace_applications.slot_id
        AND p.role IN ('manager', 'supervisor')
        AND (p.establishment_id = ms.establishment_id
          OR p.active_establishment_id = ms.establishment_id)
    )
  );

-- Employees: manage their own applications
CREATE POLICY "Employees manage own applications"
  ON public.marketplace_applications FOR ALL
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());
