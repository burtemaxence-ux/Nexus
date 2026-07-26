-- 042 — Support reports (bouton « Signaler un problème »)
-- Stocke les signalements envoyés par les utilisateurs depuis l'app.
-- Lecture réservée à l'opérateur via le service role (back-office /admin).

CREATE TABLE IF NOT EXISTS public.support_reports (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email        TEXT,
  user_name         TEXT,
  role              TEXT,
  establishment_id  UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
  url               TEXT,
  user_agent        TEXT,
  message           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'resolved'))
);

ALTER TABLE public.support_reports ENABLE ROW LEVEL SECURITY;

-- Un utilisateur connecté peut créer son propre signalement.
CREATE POLICY "support_reports_insert_own"
  ON public.support_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Aucune policy SELECT/UPDATE : seul le service role (back-office opérateur) y accède.

CREATE INDEX IF NOT EXISTS idx_support_reports_status  ON public.support_reports (status);
CREATE INDEX IF NOT EXISTS idx_support_reports_created ON public.support_reports (created_at DESC);
