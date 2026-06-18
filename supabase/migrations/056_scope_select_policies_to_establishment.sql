-- 056 — Ferme 4 fuites inter-tenant sur les policies SELECT.
-- Des policies SELECT permissives donnaient aux managers/superviseurs l'accès
-- aux données de TOUS les établissements (manque de scope establishment_id).
-- On ajoute le scope `establishment_id = current_establishment_id()` sans
-- retirer d'accès légitime. establishment_id est NOT NULL (0 ligne NULL vérifié)
-- sur ces tables → aucune donnée existante ne disparaît.
-- Appliqué en prod le 2026-06-18.

-- presences : own OR manager/supervisor, scopé établissement
drop policy if exists presences_select on public.presences;
create policy presences_select on public.presences for select using (
  establishment_id = current_establishment_id()
  and (
    employee_id = auth.uid()
    or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['manager','supervisor']))
  )
);

-- employee_documents (RH sensible) : own OR manager/supervisor, scopé établissement
drop policy if exists employee_documents_select on public.employee_documents;
create policy employee_documents_select on public.employee_documents for select using (
  establishment_id = current_establishment_id()
  and (
    employee_id = auth.uid()
    or exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['manager','supervisor']))
  )
);

-- lateness_records : manager/supervisor, scopé établissement
drop policy if exists lateness_select on public.lateness_records;
create policy lateness_select on public.lateness_records for select using (
  establishment_id = current_establishment_id()
  and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['manager','supervisor']))
);

-- audit_log : manager/supervisor, scopé établissement
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log for select using (
  establishment_id = current_establishment_id()
  and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['manager','supervisor']))
);
