-- ============================================================
-- 079 — Token iCal révocable (audit 2026-07-06, constat #7)
-- ============================================================
-- Le lien calendrier /api/calendar/[token] était un HMAC stable à vie :
-- un lien partagé ou fuité exposait le planning pour toujours. On versionne
-- le token par profil : incrémenter calendar_token_version invalide tous
-- les liens émis précédemment (version 1 = format historique, les liens
-- déjà distribués restent valides tant que l'employé ne régénère pas).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS calendar_token_version integer NOT NULL DEFAULT 1;
