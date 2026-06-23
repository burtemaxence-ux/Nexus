// Applique un diff (issu de l'IA) à un planning de base déterministe.
// Pur et testable : aucune dépendance réseau. L'IA ne renvoie QUE les
// changements (clear/add), ce qui garde sa sortie courte et l'appel rapide.

import type { ProposedShift } from './solver'

export interface PlanAdjustment {
  /** Créneaux du planning de base à SUPPRIMER, repérés par employé + jour. */
  clear: { employee_id: string; date: string }[]
  /** Créneaux à AJOUTER (déjà enrichis : nom, poste, etc.). */
  add: ProposedShift[]
}

const slot = (employee_id: string, date: string) => `${employee_id}__${date}`

/**
 * Repart du planning de base, retire les créneaux demandés, puis ajoute les
 * nouveaux. Un ajout sur un (employé, jour) déjà présent REMPLACE le créneau de
 * base (évite les doublons quand l'IA « modifie » un créneau existant).
 */
export function applyPlanAdjustment(base: ProposedShift[], adj: PlanAdjustment): ProposedShift[] {
  const cleared = new Set((adj.clear ?? []).map(c => slot(c.employee_id, c.date)))
  const addedSlots = new Set((adj.add ?? []).map(s => slot(s.employee_id, s.date)))

  const kept = base.filter(s => {
    const k = slot(s.employee_id, s.date)
    return !cleared.has(k) && !addedSlots.has(k)
  })

  return [...kept, ...(adj.add ?? [])]
}
