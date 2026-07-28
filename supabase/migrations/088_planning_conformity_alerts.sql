-- ============================================================
-- 071 — Type d'alerte 'planning_conformity'
-- ============================================================
-- Ajoute le type 'planning_conformity' à compliance_alerts. Il persiste les
-- violations de conformité planning (moteur déterministe lib/compliance/rules,
-- checkCompliance) au fil des créations / modifications de shifts et des
-- copies de semaine — sans bloquer la sauvegarde ("stocker, ne pas bloquer").
--
-- Écriture via service-role (comme le cron compliance-check) : aucune policy
-- INSERT côté client n'est requise. Les policies SELECT/UPDATE existantes
-- (managers de l'établissement) couvrent déjà ce nouveau type.
--
-- L'insertion applicative est non bloquante : tant que cette migration n'est
-- pas appliquée, l'INSERT échoue proprement (contrainte CHECK) et l'erreur est
-- avalée côté serveur — la création/modif de shift réussit quand même.
--
-- APPLY MANUALLY in the Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.compliance_alerts DROP CONSTRAINT IF EXISTS compliance_alerts_type_check;

ALTER TABLE public.compliance_alerts
  ADD CONSTRAINT compliance_alerts_type_check
  CHECK (type IN ('hours_exceeded', 'trial_ending', 'cdd_ending', 'requalification_risk', 'planning_conformity'));
