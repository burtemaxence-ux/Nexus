-- 063 — Webhook reliability: retries + payload replay (2026-06-21)
-- Adds delivery-attempt count and the delivered payload so failed webhooks can
-- be inspected and replayed from the integrations UI.

ALTER TABLE public.webhook_logs
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 1;

ALTER TABLE public.webhook_logs
  ADD COLUMN IF NOT EXISTS payload jsonb;
