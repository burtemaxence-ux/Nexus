-- ============================================================
-- 061 — Merge multiple permissive RLS policies (advisor perf)
-- ============================================================
-- Supabase advisor `multiple_permissive_policies` (×149) : plusieurs policies
-- PERMISSIVE sur la même (table, role, action) → chaque policy est évaluée à
-- chaque ligne. On consolide en UNE policy par (table, action), en combinant
-- les conditions manager / employé avec OR sur les lectures, et en restreignant
-- TO authenticated (supprime aussi le bruit anon/authenticator/dashboard_user).
--
-- TESTÉE par dry-run transactionnel (BEGIN ... ROLLBACK) contre le schéma
-- RÉEL de prod le 2026-06-19, rien persisté :
--   1. SQL valide, 0 overlap restant (table, action), 68 policies finales ;
--   2. accès runtime vérifié par impersonation JWT (manager + employé même
--      établissement + employé autre établissement) → 0 différence du nombre
--      de lignes visibles sur les 19 tables avant/après 061.
-- Le branching Supabase (plan Pro) étant indisponible, ce double dry-run l'a
-- remplacé. Reste à appliquer en prod via apply_migration après validation.
--
-- NOTE sécurité (hors périmètre perf, à traiter séparément) :
--   push_subscriptions."service role reads all push subscriptions" a un USING
--   `true` ouvert au rôle public → tout utilisateur peut lire toutes les
--   souscriptions. Comportement PRÉSERVÉ ici (SELECT USING true) pour ne pas
--   changer la sémantique dans une migration de perf, mais à restreindre.
--
-- Les conditions ci-dessous sont copiées à l'identique depuis pg_policies
-- (auth.uid() déjà encapsulé dans (SELECT ...) par la migration 059).
-- APPLY MANUALLY (sur branche d'abord).
-- ============================================================

-- ── api_tokens : "managers_read_own_tokens" (SELECT) redondant avec ALL ──
DROP POLICY IF EXISTS "managers_read_own_tokens" ON public.api_tokens;
-- "managers manage tokens" (ALL) conservée telle quelle → 1 policy/action.

-- ── audit_log : deux policies SELECT manager équivalentes ───────────────
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
-- "audit_log_manager" (SELECT) conservée.

-- ── availabilities : employé(ALL,own) + manager(ALL) ────────────────────
DROP POLICY IF EXISTS "availabilities_employee_own" ON public.availabilities;
DROP POLICY IF EXISTS "availabilities_manager" ON public.availabilities;
CREATE POLICY "availabilities_select" ON public.availabilities FOR SELECT TO authenticated
  USING (establishment_id = current_establishment_id() AND (is_manager() OR employee_id = (SELECT auth.uid())));
CREATE POLICY "availabilities_insert" ON public.availabilities FOR INSERT TO authenticated
  WITH CHECK (establishment_id = current_establishment_id() AND (is_manager() OR employee_id = (SELECT auth.uid())));
CREATE POLICY "availabilities_update" ON public.availabilities FOR UPDATE TO authenticated
  USING (establishment_id = current_establishment_id() AND (is_manager() OR employee_id = (SELECT auth.uid())))
  WITH CHECK (establishment_id = current_establishment_id() AND (is_manager() OR employee_id = (SELECT auth.uid())));
CREATE POLICY "availabilities_delete" ON public.availabilities FOR DELETE TO authenticated
  USING (establishment_id = current_establishment_id() AND (is_manager() OR employee_id = (SELECT auth.uid())));

-- ── contracts : manager(ALL) + employé(SELECT,own) ─────────────────────
DROP POLICY IF EXISTS "contracts_manager" ON public.contracts;
DROP POLICY IF EXISTS "contracts_employee_own" ON public.contracts;
CREATE POLICY "contracts_select" ON public.contracts FOR SELECT TO authenticated
  USING (establishment_id = current_establishment_id() AND (is_manager() OR employee_id = (SELECT auth.uid())));
CREATE POLICY "contracts_insert" ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (establishment_id = current_establishment_id() AND is_manager());
CREATE POLICY "contracts_update" ON public.contracts FOR UPDATE TO authenticated
  USING (establishment_id = current_establishment_id() AND is_manager())
  WITH CHECK (establishment_id = current_establishment_id() AND is_manager());
CREATE POLICY "contracts_delete" ON public.contracts FOR DELETE TO authenticated
  USING (establishment_id = current_establishment_id() AND is_manager());

-- ── employee_documents : "employee_documents_select" couvre déjà own OR manager ──
DROP POLICY IF EXISTS "documents_employee_own" ON public.employee_documents;
DROP POLICY IF EXISTS "documents_manager" ON public.employee_documents;
DROP POLICY IF EXISTS "employee_documents_select" ON public.employee_documents;
CREATE POLICY "employee_documents_select" ON public.employee_documents FOR SELECT TO authenticated
  USING (establishment_id = current_establishment_id()
         AND (employee_id = (SELECT auth.uid())
              OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['manager'::text,'supervisor'::text]))));
CREATE POLICY "employee_documents_insert" ON public.employee_documents FOR INSERT TO authenticated
  WITH CHECK (is_manager() AND establishment_id = current_establishment_id());
CREATE POLICY "employee_documents_update" ON public.employee_documents FOR UPDATE TO authenticated
  USING (is_manager() AND establishment_id = current_establishment_id())
  WITH CHECK (is_manager() AND establishment_id = current_establishment_id());
CREATE POLICY "employee_documents_delete" ON public.employee_documents FOR DELETE TO authenticated
  USING (is_manager() AND establishment_id = current_establishment_id());

-- ── lateness_records : "lateness_select" (manager) redondant ; combine SELECT ──
DROP POLICY IF EXISTS "lateness_manager" ON public.lateness_records;
DROP POLICY IF EXISTS "lateness_employee_own" ON public.lateness_records;
DROP POLICY IF EXISTS "lateness_select" ON public.lateness_records;
CREATE POLICY "lateness_select" ON public.lateness_records FOR SELECT TO authenticated
  USING (establishment_id = current_establishment_id() AND (is_manager() OR employee_id = (SELECT auth.uid())));
CREATE POLICY "lateness_insert" ON public.lateness_records FOR INSERT TO authenticated
  WITH CHECK (establishment_id = current_establishment_id() AND is_manager());
CREATE POLICY "lateness_update" ON public.lateness_records FOR UPDATE TO authenticated
  USING (establishment_id = current_establishment_id() AND is_manager())
  WITH CHECK (establishment_id = current_establishment_id() AND is_manager());
CREATE POLICY "lateness_delete" ON public.lateness_records FOR DELETE TO authenticated
  USING (establishment_id = current_establishment_id() AND is_manager());

-- ── leave_requests : manager(ALL) + employé(SELECT/INSERT/DELETE own) ───
DROP POLICY IF EXISTS "leave_manager" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_employee_select" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_employee_insert" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_employee_cancel" ON public.leave_requests;
CREATE POLICY "leave_select" ON public.leave_requests FOR SELECT TO authenticated
  USING (establishment_id = current_establishment_id() AND (is_manager() OR employee_id = (SELECT auth.uid())));
CREATE POLICY "leave_insert" ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (establishment_id = current_establishment_id() AND (is_manager() OR employee_id = (SELECT auth.uid())));
CREATE POLICY "leave_update" ON public.leave_requests FOR UPDATE TO authenticated
  USING (establishment_id = current_establishment_id() AND is_manager())
  WITH CHECK (establishment_id = current_establishment_id() AND is_manager());
CREATE POLICY "leave_delete" ON public.leave_requests FOR DELETE TO authenticated
  USING (establishment_id = current_establishment_id()
         AND (is_manager() OR (employee_id = (SELECT auth.uid()) AND status = 'pending'::text)));

-- ── marketplace_applications : employé(ALL own) + manager(ALL via slot) ──
DROP POLICY IF EXISTS "Employees manage own applications" ON public.marketplace_applications;
DROP POLICY IF EXISTS "Managers manage marketplace applications" ON public.marketplace_applications;
CREATE POLICY "marketplace_applications_select" ON public.marketplace_applications FOR SELECT TO authenticated
  USING (employee_id = (SELECT auth.uid())
         OR EXISTS (SELECT 1 FROM marketplace_slots ms JOIN profiles p ON (p.id = (SELECT auth.uid()))
                    WHERE ms.id = marketplace_applications.slot_id AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                          AND (p.establishment_id = ms.establishment_id OR p.active_establishment_id = ms.establishment_id)));
CREATE POLICY "marketplace_applications_insert" ON public.marketplace_applications FOR INSERT TO authenticated
  WITH CHECK (employee_id = (SELECT auth.uid())
         OR EXISTS (SELECT 1 FROM marketplace_slots ms JOIN profiles p ON (p.id = (SELECT auth.uid()))
                    WHERE ms.id = marketplace_applications.slot_id AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                          AND (p.establishment_id = ms.establishment_id OR p.active_establishment_id = ms.establishment_id)));
CREATE POLICY "marketplace_applications_update" ON public.marketplace_applications FOR UPDATE TO authenticated
  USING (employee_id = (SELECT auth.uid())
         OR EXISTS (SELECT 1 FROM marketplace_slots ms JOIN profiles p ON (p.id = (SELECT auth.uid()))
                    WHERE ms.id = marketplace_applications.slot_id AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                          AND (p.establishment_id = ms.establishment_id OR p.active_establishment_id = ms.establishment_id)))
  WITH CHECK (employee_id = (SELECT auth.uid())
         OR EXISTS (SELECT 1 FROM marketplace_slots ms JOIN profiles p ON (p.id = (SELECT auth.uid()))
                    WHERE ms.id = marketplace_applications.slot_id AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                          AND (p.establishment_id = ms.establishment_id OR p.active_establishment_id = ms.establishment_id)));
CREATE POLICY "marketplace_applications_delete" ON public.marketplace_applications FOR DELETE TO authenticated
  USING (employee_id = (SELECT auth.uid())
         OR EXISTS (SELECT 1 FROM marketplace_slots ms JOIN profiles p ON (p.id = (SELECT auth.uid()))
                    WHERE ms.id = marketplace_applications.slot_id AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                          AND (p.establishment_id = ms.establishment_id OR p.active_establishment_id = ms.establishment_id)));

-- ── marketplace_slots : manager(ALL) + employé(SELECT open) ────────────
DROP POLICY IF EXISTS "Managers manage marketplace slots" ON public.marketplace_slots;
DROP POLICY IF EXISTS "Employees read open slots" ON public.marketplace_slots;
CREATE POLICY "marketplace_slots_select" ON public.marketplace_slots FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                 AND (p.establishment_id = marketplace_slots.establishment_id OR p.active_establishment_id = marketplace_slots.establishment_id))
         OR (status = 'open'::text AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'employee'::text
                                               AND p.establishment_id = marketplace_slots.establishment_id)));
CREATE POLICY "marketplace_slots_insert" ON public.marketplace_slots FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                      AND (p.establishment_id = marketplace_slots.establishment_id OR p.active_establishment_id = marketplace_slots.establishment_id)));
CREATE POLICY "marketplace_slots_update" ON public.marketplace_slots FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                 AND (p.establishment_id = marketplace_slots.establishment_id OR p.active_establishment_id = marketplace_slots.establishment_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                      AND (p.establishment_id = marketplace_slots.establishment_id OR p.active_establishment_id = marketplace_slots.establishment_id)));
CREATE POLICY "marketplace_slots_delete" ON public.marketplace_slots FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                 AND (p.establishment_id = marketplace_slots.establishment_id OR p.active_establishment_id = marketplace_slots.establishment_id)));

-- ── planning_signatures : deux SELECT (employé/manager) → combine ──────
DROP POLICY IF EXISTS "employee_view_own" ON public.planning_signatures;
DROP POLICY IF EXISTS "manager_view_all" ON public.planning_signatures;
CREATE POLICY "planning_signatures_select" ON public.planning_signatures FOR SELECT TO authenticated
  USING (employee_id = (SELECT auth.uid())
         OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'manager'::text));
-- "employee_can_sign_own" (INSERT) inchangée → 1 policy/action.

-- ── postes : manager(ALL) + employé(SELECT, tout membre établissement) ──
DROP POLICY IF EXISTS "postes_manager" ON public.postes;
DROP POLICY IF EXISTS "postes_employee_view" ON public.postes;
CREATE POLICY "postes_select" ON public.postes FOR SELECT TO authenticated
  USING (establishment_id = current_establishment_id() AND (SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "postes_insert" ON public.postes FOR INSERT TO authenticated
  WITH CHECK (establishment_id = current_establishment_id() AND is_manager());
CREATE POLICY "postes_update" ON public.postes FOR UPDATE TO authenticated
  USING (establishment_id = current_establishment_id() AND is_manager())
  WITH CHECK (establishment_id = current_establishment_id() AND is_manager());
CREATE POLICY "postes_delete" ON public.postes FOR DELETE TO authenticated
  USING (establishment_id = current_establishment_id() AND is_manager());

-- ── presences : "presences_select" couvre own OR manager ; writes combinés ──
DROP POLICY IF EXISTS "presences_employee_own" ON public.presences;
DROP POLICY IF EXISTS "presences_manager" ON public.presences;
DROP POLICY IF EXISTS "presences_select" ON public.presences;
CREATE POLICY "presences_select" ON public.presences FOR SELECT TO authenticated
  USING (establishment_id = current_establishment_id()
         AND (employee_id = (SELECT auth.uid())
              OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = ANY (ARRAY['manager'::text,'supervisor'::text]))));
CREATE POLICY "presences_insert" ON public.presences FOR INSERT TO authenticated
  WITH CHECK (establishment_id = current_establishment_id() AND (is_manager() OR employee_id = (SELECT auth.uid())));
CREATE POLICY "presences_update" ON public.presences FOR UPDATE TO authenticated
  USING (establishment_id = current_establishment_id() AND (is_manager() OR employee_id = (SELECT auth.uid())))
  WITH CHECK (establishment_id = current_establishment_id() AND (is_manager() OR employee_id = (SELECT auth.uid())));
CREATE POLICY "presences_delete" ON public.presences FOR DELETE TO authenticated
  USING (establishment_id = current_establishment_id() AND (is_manager() OR employee_id = (SELECT auth.uid())));

-- ── profiles : self(ALL) + manager(ALL) ───────────────────────────────
DROP POLICY IF EXISTS "profiles_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_manager_establishment" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (is_manager() AND establishment_id = current_establishment_id()));
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()) OR (is_manager() AND establishment_id = current_establishment_id()));
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()) OR (is_manager() AND establishment_id = current_establishment_id()))
  WITH CHECK (id = (SELECT auth.uid()) OR (is_manager() AND establishment_id = current_establishment_id()));
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated
  USING (id = (SELECT auth.uid()) OR (is_manager() AND establishment_id = current_establishment_id()));

-- ── push_subscriptions : own(ALL) + service-read(SELECT true) ──────────
-- ⚠️ SELECT USING (true) PRÉSERVÉ (voir note sécurité en tête de fichier).
DROP POLICY IF EXISTS "users manage own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "service role reads all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select" ON public.push_subscriptions FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "push_subscriptions_insert" ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "push_subscriptions_update" ON public.push_subscriptions FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "push_subscriptions_delete" ON public.push_subscriptions FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ── replacement_requests : manager(ALL) + employé(SELECT candidat) ─────
DROP POLICY IF EXISTS "replacement_requests_manager" ON public.replacement_requests;
DROP POLICY IF EXISTS "replacement_requests_employee_read" ON public.replacement_requests;
CREATE POLICY "replacement_requests_select" ON public.replacement_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                 AND (p.establishment_id = replacement_requests.establishment_id OR p.active_establishment_id = replacement_requests.establishment_id))
         OR (candidates @> jsonb_build_array(jsonb_build_object('employee_id', ((SELECT auth.uid()))::text))
             AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'employee'::text)));
CREATE POLICY "replacement_requests_insert" ON public.replacement_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                      AND (p.establishment_id = replacement_requests.establishment_id OR p.active_establishment_id = replacement_requests.establishment_id)));
CREATE POLICY "replacement_requests_update" ON public.replacement_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                 AND (p.establishment_id = replacement_requests.establishment_id OR p.active_establishment_id = replacement_requests.establishment_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                      AND (p.establishment_id = replacement_requests.establishment_id OR p.active_establishment_id = replacement_requests.establishment_id)));
CREATE POLICY "replacement_requests_delete" ON public.replacement_requests FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                 AND (p.establishment_id = replacement_requests.establishment_id OR p.active_establishment_id = replacement_requests.establishment_id)));

-- ── shifts : manager(ALL) + employé(SELECT own) ───────────────────────
DROP POLICY IF EXISTS "shifts_manager" ON public.shifts;
DROP POLICY IF EXISTS "shifts_employee_own" ON public.shifts;
CREATE POLICY "shifts_select" ON public.shifts FOR SELECT TO authenticated
  USING (establishment_id = current_establishment_id() AND (is_manager() OR employee_id = (SELECT auth.uid())));
CREATE POLICY "shifts_insert" ON public.shifts FOR INSERT TO authenticated
  WITH CHECK (establishment_id = current_establishment_id() AND is_manager());
CREATE POLICY "shifts_update" ON public.shifts FOR UPDATE TO authenticated
  USING (establishment_id = current_establishment_id() AND is_manager())
  WITH CHECK (establishment_id = current_establishment_id() AND is_manager());
CREATE POLICY "shifts_delete" ON public.shifts FOR DELETE TO authenticated
  USING (establishment_id = current_establishment_id() AND is_manager());

-- ── subscriptions : manager(ALL) + "read own" (SELECT) ────────────────
DROP POLICY IF EXISTS "subscriptions_manager" ON public.subscriptions;
DROP POLICY IF EXISTS "Managers read their own subscription" ON public.subscriptions;
CREATE POLICY "subscriptions_select" ON public.subscriptions FOR SELECT TO authenticated
  USING (establishment_id IN (SELECT profiles.establishment_id FROM profiles WHERE profiles.id = (SELECT auth.uid()))
         OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                    AND (p.establishment_id = subscriptions.establishment_id OR p.active_establishment_id = subscriptions.establishment_id)));
CREATE POLICY "subscriptions_insert" ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                      AND (p.establishment_id = subscriptions.establishment_id OR p.active_establishment_id = subscriptions.establishment_id)));
CREATE POLICY "subscriptions_update" ON public.subscriptions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                 AND (p.establishment_id = subscriptions.establishment_id OR p.active_establishment_id = subscriptions.establishment_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                      AND (p.establishment_id = subscriptions.establishment_id OR p.active_establishment_id = subscriptions.establishment_id)));
CREATE POLICY "subscriptions_delete" ON public.subscriptions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['manager'::text,'supervisor'::text])
                 AND (p.establishment_id = subscriptions.establishment_id OR p.active_establishment_id = subscriptions.establishment_id)));

-- ── user_establishments : manager(ALL) + user own(SELECT) ─────────────
DROP POLICY IF EXISTS "managers_manage_own_memberships" ON public.user_establishments;
DROP POLICY IF EXISTS "users_see_own_establishments" ON public.user_establishments;
CREATE POLICY "user_establishments_select" ON public.user_establishments FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (establishment_id = current_establishment_id() AND is_manager()));
CREATE POLICY "user_establishments_insert" ON public.user_establishments FOR INSERT TO authenticated
  WITH CHECK (establishment_id = current_establishment_id() AND is_manager());
CREATE POLICY "user_establishments_update" ON public.user_establishments FOR UPDATE TO authenticated
  USING (establishment_id = current_establishment_id() AND is_manager())
  WITH CHECK (establishment_id = current_establishment_id() AND is_manager());
CREATE POLICY "user_establishments_delete" ON public.user_establishments FOR DELETE TO authenticated
  USING (establishment_id = current_establishment_id() AND is_manager());

-- ── week_status : manager(ALL) + employé(SELECT, tout membre) ─────────
DROP POLICY IF EXISTS "week_status_manager" ON public.week_status;
DROP POLICY IF EXISTS "week_status_employee_view" ON public.week_status;
CREATE POLICY "week_status_select" ON public.week_status FOR SELECT TO authenticated
  USING (establishment_id = current_establishment_id() AND (SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "week_status_insert" ON public.week_status FOR INSERT TO authenticated
  WITH CHECK (establishment_id = current_establishment_id() AND is_manager());
CREATE POLICY "week_status_update" ON public.week_status FOR UPDATE TO authenticated
  USING (establishment_id = current_establishment_id() AND is_manager())
  WITH CHECK (establishment_id = current_establishment_id() AND is_manager());
CREATE POLICY "week_status_delete" ON public.week_status FOR DELETE TO authenticated
  USING (establishment_id = current_establishment_id() AND is_manager());
