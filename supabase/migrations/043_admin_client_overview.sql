-- 043 — Fonction d'agrégation pour le back-office opérateur (/admin)
-- Retourne une ligne enrichie par établissement (client). Verrouillée au
-- service role : ni anon ni authenticated ne peuvent l'appeler.

CREATE OR REPLACE FUNCTION public.admin_client_overview()
RETURNS TABLE (
  id                    UUID,
  name                  TEXT,
  created_at            TIMESTAMPTZ,
  owner_email           TEXT,
  sub_status            TEXT,
  sub_plan              TEXT,
  trial_end             TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN,
  employees             BIGINT,
  shifts                BIGINT,
  last_activity         TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.name,
    e.created_at,
    own.email,
    s.status,
    s.plan,
    s.trial_end,
    s.cancel_at_period_end,
    (SELECT count(*) FROM profiles p
       WHERE p.establishment_id = e.id AND p.role = 'employee'
         AND coalesce(p.archived, false) = false),
    (SELECT count(*) FROM shifts sh
       WHERE sh.establishment_id = e.id AND sh.deleted_at IS NULL),
    GREATEST(
      (SELECT max(created_at) FROM shifts sh    WHERE sh.establishment_id = e.id),
      (SELECT max(created_at) FROM presences pr WHERE pr.establishment_id = e.id)
    )
  FROM establishments e
  LEFT JOIN profiles own      ON own.id = e.owner_id
  LEFT JOIN subscriptions s   ON s.establishment_id = e.id
  ORDER BY e.created_at DESC;
$$;

REVOKE ALL     ON FUNCTION public.admin_client_overview() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_client_overview() TO service_role;
