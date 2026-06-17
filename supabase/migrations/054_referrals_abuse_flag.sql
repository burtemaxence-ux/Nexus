-- 054_referrals_abuse_flag.sql
-- Anti-abus parrainage : signale les filleuls créés en rafale par un même
-- parrain (comptes fictifs potentiels). Un filleul signalé n'entre pas dans
-- le calcul de la remise tant qu'il n'a pas été revu (flagged remis à false).
-- Additif et non destructif.

alter table public.referrals
  add column if not exists flagged boolean not null default false,
  add column if not exists flag_reason text;

create index if not exists idx_referrals_flagged
  on public.referrals(referrer_id) where flagged;
