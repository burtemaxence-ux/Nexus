// Source unique des types de congé / absence.
// Utilisé par le formulaire de demande employé, la page Réglages › Congés &
// absences, l'API congés et les exports, pour éviter les libellés dupliqués et
// divergents. Les codes sont contraints en base (CHECK sur leave_requests.type).

export const LEAVE_TYPES = [
  { code: 'CP',         label: 'Congés payés',  description: 'Congés annuels légaux' },
  { code: 'RTT',        label: 'RTT',           description: 'Réduction du temps de travail' },
  { code: 'maladie',    label: 'Arrêt maladie', description: 'Arrêt de travail, justificatif requis' },
  { code: 'sans_solde', label: 'Sans solde',    description: 'Absence non rémunérée' },
  { code: 'autre',      label: 'Autre',         description: 'Congé exceptionnel (mariage, décès, naissance…)' },
] as const

export type LeaveType = (typeof LEAVE_TYPES)[number]['code']

export const LEAVE_TYPE_CODES = LEAVE_TYPES.map(t => t.code)

export function leaveTypeLabel(code: string): string {
  return LEAVE_TYPES.find(t => t.code === code)?.label ?? code
}

// Réglage par type, configurable dans Réglages › Congés & absences :
//  - enabled     : le type est proposé dans le formulaire de demande de l'employé.
//  - validation  : 'auto' approuve la demande immédiatement (et libère les
//                  créneaux) ; 'manager' la laisse en attente de validation.
//  - notice_days : délai de prévenance affiché au salarié (indicatif, non bloquant).
export type LeaveValidation = 'auto' | 'manager'
export type LeaveTypeSetting = { enabled: boolean; validation: LeaveValidation; notice_days: number }
export type LeaveTypesConfig = Record<LeaveType, LeaveTypeSetting>

const DEFAULTS: Record<LeaveType, LeaveTypeSetting> = {
  CP:         { enabled: true, validation: 'manager', notice_days: 14 },
  RTT:        { enabled: true, validation: 'manager', notice_days: 7  },
  maladie:    { enabled: true, validation: 'auto',    notice_days: 0  },
  sans_solde: { enabled: true, validation: 'manager', notice_days: 7  },
  autre:      { enabled: true, validation: 'manager', notice_days: 1  },
}

export function defaultLeaveConfig(): LeaveTypesConfig {
  return LEAVE_TYPE_CODES.reduce((acc, code) => {
    acc[code] = { ...DEFAULTS[code] }
    return acc
  }, {} as LeaveTypesConfig)
}

// Ancienne config keyée par libellé d'affichage → migration vers les codes.
const LEGACY_LABEL_TO_CODE: Record<string, LeaveType> = {
  'Congés payés': 'CP',
  'RTT': 'RTT',
  'Maladie': 'maladie',
  'Sans solde': 'sans_solde',
  'Congé exceptionnel': 'autre',
}

export function parseLeaveConfig(raw: string | undefined | null): LeaveTypesConfig {
  const config = defaultLeaveConfig()
  if (!raw) return config

  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return config }
  if (!parsed || typeof parsed !== 'object') return config

  const obj = parsed as Record<string, Partial<LeaveTypeSetting>>
  const apply = (code: LeaveType, entry: Partial<LeaveTypeSetting> | undefined) => {
    if (!entry || typeof entry !== 'object') return
    if (typeof entry.enabled === 'boolean') config[code].enabled = entry.enabled
    if (entry.validation === 'auto' || entry.validation === 'manager') config[code].validation = entry.validation
    if (typeof entry.notice_days === 'number' && entry.notice_days >= 0) config[code].notice_days = entry.notice_days
  }

  for (const code of LEAVE_TYPE_CODES) apply(code, obj[code])
  // Repli sur l'ancien format (clés = libellés) si le code n'est pas déjà présent.
  for (const [label, code] of Object.entries(LEGACY_LABEL_TO_CODE)) {
    if (!(code in obj) && obj[label]) apply(code, obj[label])
  }
  return config
}

// Types proposés dans le formulaire de demande. Jamais vide : si rien n'est
// activé, on propose tous les types pour ne pas bloquer les demandes.
export function enabledLeaveTypes(config: LeaveTypesConfig): LeaveType[] {
  const list = LEAVE_TYPE_CODES.filter(c => config[c].enabled)
  return list.length > 0 ? list : [...LEAVE_TYPE_CODES]
}
