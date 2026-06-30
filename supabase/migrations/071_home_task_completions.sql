-- 071 — Tâches « À faire aujourd'hui » du dashboard manager
--
-- Les tâches affichées sur l'accueil sont dérivées de signaux réels (planning
-- non publié, pointages à vérifier, congés/échanges/contrats en attente). Cette
-- table ne stocke que l'état « coché » par manager et par jour ; la liste des
-- tâches elle-même reste calculée à la volée.

CREATE TABLE IF NOT EXISTS public.home_task_completions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
  task_key         TEXT NOT NULL,
  day              DATE NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, task_key, day)
);

ALTER TABLE public.home_task_completions ENABLE ROW LEVEL SECURITY;

-- Chaque manager ne voit et ne gère que ses propres cases cochées.
CREATE POLICY "Users read own home task completions"
  ON public.home_task_completions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own home task completions"
  ON public.home_task_completions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own home task completions"
  ON public.home_task_completions FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_home_task_completions_user_day
  ON public.home_task_completions (user_id, day);
