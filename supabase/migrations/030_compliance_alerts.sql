-- 030 — Table compliance_alerts

CREATE TABLE IF NOT EXISTS public.compliance_alerts (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
  employee_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('hours_exceeded', 'trial_ending', 'cdd_ending', 'requalification_risk')),
  level            TEXT NOT NULL CHECK (level IN ('INFO', 'WARNING', 'CRITICAL')),
  title            TEXT NOT NULL,
  message          TEXT NOT NULL,
  options          JSONB DEFAULT '{}',
  status           TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'resolved', 'ignored')),
  resolved_at      TIMESTAMPTZ,
  resolved_by      UUID REFERENCES public.profiles(id),
  ignored_until    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.compliance_alerts ENABLE ROW LEVEL SECURITY;

-- Managers/superviseurs : lecture des alertes de leur établissement actif
CREATE POLICY "Managers read compliance alerts"
  ON public.compliance_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'supervisor')
        AND (p.establishment_id = compliance_alerts.establishment_id
          OR p.active_establishment_id = compliance_alerts.establishment_id)
    )
  );

-- Managers/superviseurs : mise à jour (status, resolved_at, resolved_by, ignored_until)
CREATE POLICY "Managers update compliance alerts"
  ON public.compliance_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'supervisor')
        AND (p.establishment_id = compliance_alerts.establishment_id
          OR p.active_establishment_id = compliance_alerts.establishment_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'supervisor')
        AND (p.establishment_id = compliance_alerts.establishment_id
          OR p.active_establishment_id = compliance_alerts.establishment_id)
    )
  );

-- Employés : aucun accès (aucune policy SELECT/INSERT/UPDATE/DELETE pour le rôle employee)

-- Index pour le badge compteur (nb d'alertes actives par établissement + niveau)
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_establishment_status_level
  ON public.compliance_alerts (establishment_id, status, level);

-- Index pour l'historique par employé
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_employee_type_created
  ON public.compliance_alerts (employee_id, type, created_at DESC);

-- Fonction updated_at générique (CREATE OR REPLACE : sans risque de conflit)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER compliance_alerts_updated_at
  BEFORE UPDATE ON public.compliance_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
