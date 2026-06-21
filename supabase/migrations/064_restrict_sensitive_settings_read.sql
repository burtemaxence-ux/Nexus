-- 064 — Restrict reads of sensitive settings to managers (2026-06-21)
-- The settings table is readable by every establishment member (needed for
-- non-secret keys like opening hours, break rules, collective agreement, the
-- VAPID *public* key…). A few keys are credentials/capability URLs that only
-- managers should see: outgoing webhook URL, Slack incoming webhook URL and the
-- webhook signing secret. Server-side delivery reads these via the service-role
-- client (which bypasses RLS), so restricting them here does not break webhooks.
--
-- NOTE: vapid_private_key is intentionally NOT restricted here — the push sender
-- still falls back to reading it via the caller's session; tightening it needs a
-- separate change to lib/push.ts and is tracked as a follow-up.

DROP POLICY IF EXISTS "settings_read" ON public.settings;

CREATE POLICY "settings_read"
ON public.settings FOR SELECT
USING (
  establishment_id = public.current_establishment_id()
  AND (
    key NOT IN ('webhook_url', 'slack_webhook_url', 'webhook_signing_secret')
    OR public.is_manager()
  )
);
