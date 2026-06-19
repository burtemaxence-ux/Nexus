-- 058 — Idempotence des webhooks Stripe.
-- Stripe peut redélivrer le même event (retry, timeout). Sans dédup, les effets
-- de bord non idempotents (coupon « 1er mois offert » du filleul, remise du
-- parrain) pourraient être ré-appliqués. On enregistre chaque event.id traité ;
-- le handler ignore un event déjà vu, et supprime le marqueur si le traitement
-- échoue (pour autoriser le retry). Accès réservé au service role.
-- Appliqué en prod le 2026-06-18.

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  type text,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
-- Pas de policy : seules les requêtes service role (qui bypass la RLS) y accèdent.
