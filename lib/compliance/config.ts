import type { ComplianceConfig } from './rules'

export type AlertKey = keyof ComplianceConfig

// Clés de réglage (table settings) contrôlant les alertes contextuelles.
export const COMPLIANCE_ALERT_KEYS = [
  'alert_night_work',
  'alert_sunday_work',
  'alert_part_time_split',
  'alert_hours_avg_weekly',
] as const

// Défaut GÉNÉRIQUE (convention inconnue ou « Autre ») : toutes les alertes
// actives, par prudence — on ne présume pas qu'une convention non identifiée
// encadre le travail de nuit/dimanche.
const GENERIC_DEFAULT: Record<AlertKey, boolean> = {
  night_work: true,
  sunday_work: true,
  part_time_split: true,
  hours_avg_weekly: true,
}

// Toutes les conventions du secteur encadrent le travail de nuit ET du dimanche
// avec majorations → ces deux alertes « à vérifier » sont du bruit, désactivées
// par défaut. Les deux autres restent actives.
const COVERS_NIGHT_AND_SUNDAY: Partial<Record<AlertKey, boolean>> = {
  night_work: false,
  sunday_work: false,
}

// Défauts d'alertes PAR CONVENTION (code IDCC + valeur historique 'HCR' seedée
// en base). Source unique pour ajuster finement l'état initial des alertes
// selon la convention choisie à la création du compte. Une entrée ne précise
// que ce qui diffère du GENERIC_DEFAULT.
export const CONVENTION_ALERT_DEFAULTS: Record<string, Partial<Record<AlertKey, boolean>>> = {
  HCR: COVERS_NIGHT_AND_SUNDAY,          // valeur par défaut seedée (migration 016)
  'IDCC 1786': COVERS_NIGHT_AND_SUNDAY,  // CHR — Cafés Hôtels Restaurants
  'IDCC 1286': COVERS_NIGHT_AND_SUNDAY,  // CHR — ancienne convention
  'IDCC 1501': COVERS_NIGHT_AND_SUNDAY,  // Restauration rapide
  'IDCC 3061': COVERS_NIGHT_AND_SUNDAY,  // Boulangerie-pâtisserie artisanale (nuit inhérente)
  'IDCC 2601': COVERS_NIGHT_AND_SUNDAY,  // Boulangerie industrielle
  'IDCC 1979': COVERS_NIGHT_AND_SUNDAY,  // Hôtellerie
  'IDCC 1938': COVERS_NIGHT_AND_SUNDAY,  // Traiteurs
  'IDCC 2060': COVERS_NIGHT_AND_SUNDAY,  // Hôtellerie de plein air
  'IDCC 2584': COVERS_NIGHT_AND_SUNDAY,  // Pizzerias
}

// État d'alerte par défaut pour une convention donnée (avant tout réglage
// manuel). Sert à INITIALISER les alertes à la création du compte / au choix
// de la convention, et de repli quand un réglage explicite est absent.
export function defaultAlertsForConvention(ccn: string | null | undefined): Record<AlertKey, boolean> {
  const conv = ccn ? CONVENTION_ALERT_DEFAULTS[ccn] : undefined
  return {
    night_work: conv?.night_work ?? GENERIC_DEFAULT.night_work,
    sunday_work: conv?.sunday_work ?? GENERIC_DEFAULT.sunday_work,
    part_time_split: conv?.part_time_split ?? GENERIC_DEFAULT.part_time_split,
    hours_avg_weekly: conv?.hours_avg_weekly ?? GENERIC_DEFAULT.hours_avg_weekly,
  }
}

// Construit la config de conformité à partir des réglages de l'établissement.
// Le défaut de chaque alerte dépend de la convention (defaultAlertsForConvention) ;
// un réglage explicite ('on'/'off') prime toujours sur ce défaut.
export function buildComplianceConfig(settings: Record<string, string | null | undefined>): ComplianceConfig {
  const def = defaultAlertsForConvention(settings.collective_agreement)
  const flag = (v: string | null | undefined, d: boolean) => (v === 'on' ? true : v === 'off' ? false : d)
  return {
    night_work: flag(settings.alert_night_work, def.night_work),
    sunday_work: flag(settings.alert_sunday_work, def.sunday_work),
    part_time_split: flag(settings.alert_part_time_split, def.part_time_split),
    hours_avg_weekly: flag(settings.alert_hours_avg_weekly, def.hours_avg_weekly),
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
