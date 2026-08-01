-- ============================================================
-- 087 — Instantané de référence de la démonstration
-- ============================================================
-- La démo publique est modifiable par n'importe quel visiteur. Sans état de
-- référence, elle dérive (services déplacés ou supprimés) et se périme (les
-- dates figées s'éloignent de la semaine courante) jusqu'à ce qu'un acquéreur
-- tombe sur un planning vide.
--
-- L'instantané est stocké en OFFSETS de semaine et de jour, jamais en dates
-- absolues : le rejouer suffit donc à traiter la dérive et la péremption d'un
-- seul coup. Cf. public.reset_demo_data() en migration 088.

CREATE TABLE IF NOT EXISTS public.demo_snapshot (
  kind        TEXT NOT NULL,
  payload     JSONB NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kind)
);

-- RLS active sans aucune policy : table de service, accessible au seul
-- service_role — même parti pris que rate_limit_hits (081) et ai_batch_jobs (082).
ALTER TABLE public.demo_snapshot ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.demo_snapshot IS
  'État de référence de l''établissement de démonstration, rejoué chaque nuit par public.reset_demo_data().';
