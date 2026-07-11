-- ============================================================
-- 072 — Anti-doublon de créneaux (index unique partiel)
-- ============================================================
-- Empêche l'insertion de deux créneaux STRICTEMENT identiques (même employé,
-- même date, mêmes horaires) non supprimés. Filet de sécurité en base contre
-- les doublons créés par une double génération de planning, un double-clic ou
-- un ré-appel réseau — en complément du contrôle applicatif (skip des
-- chevauchements dans /api/shifts/bulk et /api/shifts).
--
-- Volontairement limité au doublon EXACT (pas au chevauchement partiel, qui
-- exigerait btree_gist + une contrainte EXCLUDE sur des plages horaires — le
-- chevauchement partiel est géré côté applicatif). Index partiel WHERE
-- deleted_at IS NULL : un créneau soft-supprimé ne bloque pas la recréation.
--
-- ⚠️ Si des doublons exacts existent déjà en base, la création de l'index
-- échoue : dédupliquer d'abord (garder un id par groupe, soft-delete les
-- autres) puis relancer.
--
-- APPLY MANUALLY in the Supabase SQL Editor.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS shifts_no_exact_duplicate
  ON public.shifts (employee_id, date, start_time, end_time)
  WHERE deleted_at IS NULL;
