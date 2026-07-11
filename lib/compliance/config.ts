import type { ComplianceConfig } from './rules'

// Clés de réglage (table settings) contrôlant les alertes contextuelles.
export const COMPLIANCE_ALERT_KEYS = [
  'alert_night_work',
  'alert_sunday_work',
  'alert_part_time_split',
  'alert_hours_avg_weekly',
] as const

// Construit la config de conformité à partir des réglages de l'établissement.
//
// Défauts : dès qu'une convention collective est renseignée (≠ « Autre »), les
// alertes « travail de nuit » et « travail le dimanche » sont OFF — toutes les
// CCN du secteur (CHR, boulangerie, restauration rapide…) encadrent ces cas
// avec des majorations, donc l'alerte « à vérifier » est du bruit. Sans CCN
// (ou « Autre »), elles restent ON par prudence. « coupure temps partiel » et
// « moyenne 44h/12 sem. » restent ON par défaut. Chaque alerte est réglable
// explicitement ('on'/'off') et l'override prime sur le défaut.
export function buildComplianceConfig(settings: Record<string, string | null | undefined>): ComplianceConfig {
  const ccn = settings.collective_agreement
  const ccnCovers = !!ccn && ccn !== 'Autre'
  const flag = (v: string | null | undefined, def: boolean) => (v === 'on' ? true : v === 'off' ? false : def)
  return {
    night_work: flag(settings.alert_night_work, !ccnCovers),
    sunday_work: flag(settings.alert_sunday_work, !ccnCovers),
    part_time_split: flag(settings.alert_part_time_split, true),
    hours_avg_weekly: flag(settings.alert_hours_avg_weekly, true),
  }
}

// Colonnes settings à lire pour construire la config (collective_agreement + toggles).
export const COMPLIANCE_SETTINGS_KEYS = ['collective_agreement', ...COMPLIANCE_ALERT_KEYS] as const

// Transforme des lignes { key, value } (table settings) en config de conformité.
export function complianceConfigFromRows(rows: { key: string; value: string }[] | null | undefined): ComplianceConfig {
  const map: Record<string, string> = {}
  for (const row of rows ?? []) map[row.key] = row.value
  return buildComplianceConfig(map)
}
