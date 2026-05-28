-- 031 — Table replacement_requests

CREATE TABLE IF NOT EXISTS public.replacement_requests (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id      UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
  absent_employee_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  shift_id              UUID REFERENCES public.shifts(id) ON DELETE CASCADE,
  status                TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
  -- Tableau d'objets : [{"employee_id": "uuid", "score": 8.5, "explanation": "...", "notified_at": null, "response": null}]
  candidates            JSONB NOT NULL DEFAULT '[]',
  confirmed_employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  expires_at            TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.replacement_requests ENABLE ROW LEVEL SECURITY;

-- Managers/superviseurs : accès complet aux demandes de leur établissement
CREATE POLICY "Managers manage replacement requests"
  ON public.replacement_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'supervisor')
        AND (p.establishment_id = replacement_requests.establishment_id
          OR p.active_establishment_id = replacement_requests.establishment_id)
    )
  );

-- Employés : lecture uniquement des demandes où ils figurent dans candidates
CREATE POLICY "Employees read own candidate requests"
  ON public.replacement_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'employee'
    )
    AND candidates @> jsonb_build_array(
      jsonb_build_object('employee_id', auth.uid()::text)
    )
  );

-- Index pour la liste des demandes par établissement
CREATE INDEX IF NOT EXISTS idx_replacement_requests_establishment_status_created
  ON public.replacement_requests (establishment_id, status, created_at DESC);

-- Index par shift_id pour les jointures
CREATE INDEX IF NOT EXISTS idx_replacement_requests_shift
  ON public.replacement_requests (shift_id);

-- Un seul replacement_request actif (pending ou confirmed) par shift
CREATE UNIQUE INDEX IF NOT EXISTS replacement_request_active_unique
  ON public.replacement_requests (shift_id)
  WHERE status IN ('pending', 'confirmed');
