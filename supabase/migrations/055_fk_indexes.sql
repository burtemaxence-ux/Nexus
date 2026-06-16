-- 055_fk_indexes.sql
-- Index sur les clés étrangères non couvertes (détectées par l'advisor perf
-- Supabase). Améliore les jointures et les suppressions ON DELETE CASCADE.
-- Additif et idempotent.

create index if not exists idx_api_tokens_user on public.api_tokens(user_id);
create index if not exists idx_audit_log_establishment on public.audit_log(establishment_id);
create index if not exists idx_availabilities_establishment on public.availabilities(establishment_id);
create index if not exists idx_compliance_alerts_resolved_by on public.compliance_alerts(resolved_by);
create index if not exists idx_contracts_created_by on public.contracts(created_by);
create index if not exists idx_employee_documents_uploaded_by on public.employee_documents(uploaded_by);
create index if not exists idx_establishments_owner on public.establishments(owner_id);
create index if not exists idx_marketplace_slots_created_by on public.marketplace_slots(created_by);
create index if not exists idx_marketplace_slots_filled_by on public.marketplace_slots(filled_by);
create index if not exists idx_profiles_active_establishment on public.profiles(active_establishment_id);
create index if not exists idx_replacement_requests_absent_employee on public.replacement_requests(absent_employee_id);
create index if not exists idx_replacement_requests_confirmed_employee on public.replacement_requests(confirmed_employee_id);
create index if not exists idx_shift_exchanges_acceptor on public.shift_exchanges(acceptor_id);
create index if not exists idx_shift_exchanges_proposer on public.shift_exchanges(proposer_id);
create index if not exists idx_shift_exchanges_shift on public.shift_exchanges(shift_id);
create index if not exists idx_shifts_poste on public.shifts(poste_id);
create index if not exists idx_user_establishments_establishment on public.user_establishments(establishment_id);
