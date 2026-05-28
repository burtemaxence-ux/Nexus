-- 029 — Table notifications

CREATE TABLE IF NOT EXISTS public.notifications (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
  type             TEXT NOT NULL,
  title            TEXT NOT NULL,
  body             TEXT NOT NULL,
  data             JSONB DEFAULT '{}',
  action_url       TEXT,
  read             BOOLEAN DEFAULT FALSE,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur voit uniquement ses propres notifications
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- Seul le service role peut créer des notifications (pas de policy INSERT pour authenticated)

-- Un utilisateur peut mettre à jour uniquement ses propres notifications (ex: marquer comme lue)
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Un utilisateur peut supprimer uniquement ses propres notifications
CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- Index pour le panel notifications (filtre read + tri chronologique)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications (user_id, read, created_at DESC);

-- Index pour les stats par établissement
CREATE INDEX IF NOT EXISTS idx_notifications_establishment_created
  ON public.notifications (establishment_id, created_at DESC);
