-- 081 — Rate limiting durable (Postgres).
--
-- Le limiteur horaire de lib/rate-limit.ts reposait sur Vercel KV avec
-- fallback in-memory ; sans KV configuré, chaque cold start serverless
-- remettait les compteurs à zéro (protection illusoire sur invitations,
-- resend-link, clock-in, callback auth…). On ajoute un étage Postgres,
-- toujours disponible et atomique : la chaîne devient KV → Postgres →
-- in-memory. Même philosophie que le quota IA (048/060), mais générique
-- (clé libre, fenêtre fixe alignée sur l'epoch).
--
-- La fonction n'est PAS exécutable par anon/authenticated : un utilisateur
-- pourrait sinon consommer les fenêtres des autres. Elle est appelée côté
-- serveur via le client service role.

CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  key          text        NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- Aucune policy : RLS activée sans policy = accès uniquement service role
-- (bypass RLS) et fonctions SECURITY DEFINER.
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key            text,
  p_limit          integer,
  p_window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_window_start timestamptz := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  v_reset_at     timestamptz := v_window_start + make_interval(secs => p_window_seconds);
  v_count        integer;
BEGIN
  INSERT INTO public.rate_limit_hits AS h (key, window_start, count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = h.count + 1
  RETURNING h.count INTO v_count;

  -- Ménage opportuniste (~1 appel sur 100) : purge les fenêtres expirées.
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '2 days';
  END IF;

  RETURN jsonb_build_object(
    'allowed',   v_count <= p_limit,
    'remaining', greatest(p_limit - v_count, 0),
    'reset_at',  (extract(epoch FROM v_reset_at) * 1000)::bigint
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;
