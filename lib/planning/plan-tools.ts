import type Anthropic from '@anthropic-ai/sdk'
import type { ProposedShift } from './solver'
import { checkCompliance, RULES, type EmployeeMeta } from '@/lib/compliance/rules'
import { ACTIONABLE, toRecords } from './repair'

// Correspondances pour enrichir un shift proposé par le LLM.
export type ShiftLookups = {
  employeeNameMap: Record<string, string>
  employeePositionMap: Record<string, string | null>
  posteMap: Record<string, { name?: string } | undefined>
}

type ProposeInput = {
  employee_id?: string
  date?: string
  start_time?: string
  end_time?: string
  break_minutes?: number
  poste_id?: string
  notes?: string
}

// Infractions ACTIONABLE (cf. repair.ts) que ce créneau introduit chez son
// employé par rapport à ses créneaux déjà acceptés — permet de rejeter le
// créneau AVANT qu'il n'entre dans le planning, au lieu de le laisser passer
// et de le supprimer après coup (repairPlan). Diffing avant/après plutôt
// qu'une vérification isolée du créneau : capture aussi les règles qui ne se
// déclenchent qu'en cumul (heures/semaine, jours consécutifs, repos hebdo…).
function newViolations(accepted: ProposedShift[], candidate: ProposedShift, employees?: EmployeeMeta[]) {
  const empShifts = accepted.filter(s => s.employee_id === candidate.employee_id)
  const before = new Set(
    checkCompliance(toRecords(empShifts), employees)
      .filter(v => ACTIONABLE.has(v.ruleId))
      .map(v => `${v.ruleId}__${v.date}`),
  )
  return checkCompliance(toRecords([...empShifts, candidate]), employees)
    .filter(v => ACTIONABLE.has(v.ruleId) && !before.has(`${v.ruleId}__${v.date}`))
}

// Traite UNE réponse de l'assistant : collecte les shifts valides et produit un
// tool_result pour CHAQUE bloc tool_use.
//
// Point critique (corrige l'erreur API « tool_use ids were found without
// tool_result blocks ») : chaque tool_use DOIT recevoir un tool_result, même si
// la réponse s'est arrêtée sur max_tokens en plein milieu d'un appel d'outil.
// Les appels incomplets reçoivent un tool_result marqué is_error.
//
// Au-delà de ce nombre de rejets pour le même employé/jour, on accepte le
// créneau malgré la violation restante plutôt que de laisser le modèle
// boucler indéfiniment sur un cas qu'il n'arrive pas à corriger (chaque rejet
// coûte un aller-retour complet vers l'API — sur un cas récalcitrant, ça peut
// épuiser tout le budget de temps de la génération pour un seul créneau). Le
// filet de sécurité habituel (repairPlan / alertes de conformité) prend alors
// le relais, comme avant l'ajout de cette vérification en temps réel.
const MAX_REJECTIONS_PER_SLOT = 2

// `priorShifts` = créneaux déjà acceptés dans les itérations précédentes de la
// boucle LLM (cf. app/api/ai/plan/route.ts) : sert de base pour détecter les
// infractions introduites par un nouveau créneau. Un créneau non conforme est
// REJETÉ (is_error) avec le détail de la règle violée, pour que le modèle se
// corrige immédiatement au lieu de laisser passer une infraction qui
// n'apparaîtrait qu'après coup en alerte de conformité.
//
// `rejectionCounts` = compteur de rejets par employé/jour, partagé (même Map)
// entre tous les appels de la boucle LLM (cf. app/api/ai/plan/route.ts) pour
// appliquer MAX_REJECTIONS_PER_SLOT sur l'ensemble de la génération, pas juste
// au sein d'un seul appel.
export function collectProposedShifts(
  content: Anthropic.ContentBlock[],
  lookups: ShiftLookups,
  priorShifts: ProposedShift[] = [],
  employees?: EmployeeMeta[],
  rejectionCounts: Map<string, number> = new Map(),
): { shifts: ProposedShift[]; toolResults: Anthropic.ToolResultBlockParam[]; hasToolUse: boolean } {
  const { employeeNameMap, employeePositionMap, posteMap } = lookups
  const shifts: ProposedShift[] = []
  const accepted = [...priorShifts]
  const toolResults: Anthropic.ToolResultBlockParam[] = []

  const toolUses = content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')

  for (const block of toolUses) {
    const input = (block.input ?? {}) as ProposeInput
    const valid = block.name === 'propose_shift'
      && !!input.employee_id && !!input.date && !!input.start_time && !!input.end_time

    if (!valid) {
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: 'Ignoré : données de créneau incomplètes.',
        is_error: true,
      })
      continue
    }

    const candidate: ProposedShift = {
      employee_id: input.employee_id!,
      employee_name: employeeNameMap[input.employee_id!] ?? input.employee_id!,
      date: input.date!,
      start_time: input.start_time!,
      end_time: input.end_time!,
      break_minutes: input.break_minutes ?? 0,
      poste_id: input.poste_id ?? null,
      position: input.poste_id
        ? (posteMap[input.poste_id]?.name ?? employeePositionMap[input.employee_id!] ?? null)
        : (employeePositionMap[input.employee_id!] ?? null),
      notes: input.notes ?? null,
    }

    const violations = newViolations(accepted, candidate, employees)
    if (violations.length > 0) {
      const slotKey = `${candidate.employee_id}__${candidate.date}`
      const rejections = (rejectionCounts.get(slotKey) ?? 0) + 1
      rejectionCounts.set(slotKey, rejections)

      if (rejections > MAX_REJECTIONS_PER_SLOT) {
        // Le modèle n'arrive pas à corriger ce créneau après plusieurs essais :
        // on l'accepte tel quel plutôt que de continuer à consommer des
        // allers-retours, et on laisse le filet de sécurité s'en occuper.
        accepted.push(candidate)
        shifts.push(candidate)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: `OK (créé malgré une non-conformité persistante après ${rejections} essais — sera signalé dans les alertes de conformité) : ${candidate.date} ${candidate.start_time}-${candidate.end_time} pour ${candidate.employee_name}`,
        })
        continue
      }

      const detail = violations
        .map(v => `${RULES[v.ruleId].name} (${v.description})${v.suggestedFix ? ` → ${v.suggestedFix}` : ''}`)
        .join(' ; ')
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: `REJETÉ, non conforme au Code du travail : ${detail}. Corrige les horaires de ce créneau (${candidate.employee_name}, ${candidate.date}) et propose-le à nouveau, ou renonce à ce créneau.`,
        is_error: true,
      })
      continue
    }

    accepted.push(candidate)
    shifts.push(candidate)
    toolResults.push({
      type: 'tool_result',
      tool_use_id: block.id,
      content: `OK: ${candidate.date} ${candidate.start_time}-${candidate.end_time} pour ${candidate.employee_name}`,
    })
  }

  return { shifts, toolResults, hasToolUse: toolUses.length > 0 }
}
