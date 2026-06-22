-- 069 — Enrichissement contrat : rémunération mensuelle, classification, avantages
--
-- Complète le module contrats au niveau des apps RH : salaire brut mensuel,
-- classification/coefficient de la convention collective, et avantages
-- (mutuelle, tickets resto, remboursement transport 50 %).

alter table public.contracts
  add column if not exists monthly_gross_salary        numeric(10,2),
  add column if not exists classification              text,
  add column if not exists coefficient                 text,
  add column if not exists has_mutuelle                boolean not null default false,
  add column if not exists has_meal_vouchers           boolean not null default false,
  add column if not exists meal_voucher_value          numeric(6,2),
  add column if not exists has_transport_reimbursement boolean not null default false;
