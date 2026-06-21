-- 065 — Also restrict vapid_private_key reads to managers (2026-06-21)
-- Completes 064. The Web Push private key is an app credential; only managers
-- should read it. The push sender (lib/push.ts) now reads the VAPID fallback via
-- the service-role client, so restricting it here does not disable push for
-- employee-triggered notifications. The VAPID *public* key stays readable by all
-- members (clients need it to subscribe).

DROP POLICY IF EXISTS "settings_read" ON public.settings;

CREATE POLICY "settings_read"
ON public.settings FOR SELECT
USING (
  establishment_id = public.current_establishment_id()
  AND (
    key NOT IN (
      'webhook_url',
      'slack_webhook_url',
      'webhook_signing_secret',
      'vapid_private_key'
    )
    OR public.is_manager()
  )
);
