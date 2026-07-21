-- 082 — Jobs Batch API Anthropic (briefs hebdo managers).
--
-- Le brief hebdo passe sur la Batch API (−50 % du coût IA) en deux phases :
-- le cron weekly-brief-submit (lundi 6h30 UTC) soumet un batch (une requête
-- par établissement) et enregistre le job ici ; le cron weekly-brief-manager
-- (7h00) retrouve le job, récupère les résultats et envoie les briefs.
-- `payload` porte les données par établissement (contexte, libellé semaine)
-- pour que la phase d'envoi puisse régénérer en synchrone tout brief dont le
-- résultat batch n'est pas prêt. Sans job enregistré, le cron de 7h retombe
-- sur le chemin synchrone historique — aucun brief ne peut être perdu.

CREATE TABLE IF NOT EXISTS public.ai_batch_jobs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  feature    text        NOT NULL,
  batch_id   text        NOT NULL,
  status     text        NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'processed')),
  payload    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_batch_jobs_feature_status
  ON public.ai_batch_jobs (feature, status, created_at DESC);

-- RLS sans policy : accès service role uniquement (comme rate_limit_hits).
ALTER TABLE public.ai_batch_jobs ENABLE ROW LEVEL SECURITY;
