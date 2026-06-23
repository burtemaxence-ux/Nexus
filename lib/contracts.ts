// Source unique des types de contrat employé.
// Utilisé par les formulaires employé (création / édition) ET la page
// Réglages › Contrats & RH, pour éviter les listes dupliquées et divergentes.

export const CONTRACT_TYPES = ['CDI 35h', 'CDI 28h', 'CDD', 'CDD Saisonnier', 'Extra'] as const

export type ContractType = (typeof CONTRACT_TYPES)[number]

// Réglage par type, configurable dans Réglages › Contrats & RH :
//  - enabled   : le type est proposé dans le menu de création / édition d'un employé.
//  - ref_hours : volume horaire hebdomadaire de référence (repère), pré-rempli à la
//                création. 0 = non défini.
export type ContractTypeSetting = { enabled: boolean; ref_hours: number }
export type ContractTypesConfig = Record<ContractType, ContractTypeSetting>

const DEFAULT_REF_HOURS: Record<ContractType, number> = {
  'CDI 35h': 35,
  'CDI 28h': 28,
  'CDD': 35,
  'CDD Saisonnier': 35,
  'Extra': 0,
}

export function defaultContractConfig(): ContractTypesConfig {
  return CONTRACT_TYPES.reduce((acc, t) => {
    acc[t] = { enabled: true, ref_hours: DEFAULT_REF_HOURS[t] }
    return acc
  }, {} as ContractTypesConfig)
}

// Lit la config stockée (chaîne JSON). Tolère l'ancien format
// ({ max_hours_week, alert_* }) et ignore les types qui n'existent plus.
export function parseContractConfig(raw: string | undefined | null): ContractTypesConfig {
  const config = defaultContractConfig()
  if (!raw) return config

  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return config }
  if (!parsed || typeof parsed !== 'object') return config

  const obj = parsed as Record<string, { enabled?: boolean; ref_hours?: number; max_hours_week?: number }>
  for (const t of CONTRACT_TYPES) {
    const entry = obj[t]
    if (!entry || typeof entry !== 'object') continue
    if (typeof entry.enabled === 'boolean') config[t].enabled = entry.enabled
    if (typeof entry.ref_hours === 'number' && entry.ref_hours > 0) {
      config[t].ref_hours = entry.ref_hours
    } else if (typeof entry.max_hours_week === 'number' && entry.max_hours_week > 0) {
      config[t].ref_hours = entry.max_hours_week // migration depuis l'ancien format
    }
  }
  return config
}

// Types proposés dans les menus de création / édition. Jamais vide : si rien n'est
// activé, on propose tous les types pour ne pas bloquer la création d'employés.
export function enabledContractTypes(config: ContractTypesConfig): ContractType[] {
  const list = CONTRACT_TYPES.filter(t => config[t].enabled)
  return list.length > 0 ? list : [...CONTRACT_TYPES]
}
