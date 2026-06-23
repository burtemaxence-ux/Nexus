import type Anthropic from '@anthropic-ai/sdk'
import type { ProposedShift } from './solver'

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

// Traite UNE réponse de l'assistant : collecte les shifts valides et produit un
// tool_result pour CHAQUE bloc tool_use.
//
// Point critique (corrige l'erreur API « tool_use ids were found without
// tool_result blocks ») : chaque tool_use DOIT recevoir un tool_result, même si
// la réponse s'est arrêtée sur max_tokens en plein milieu d'un appel d'outil.
// Les appels incomplets reçoivent un tool_result marqué is_error.
export function collectProposedShifts(
  content: Anthropic.ContentBlock[],
  lookups: ShiftLookups,
): { shifts: ProposedShift[]; toolResults: Anthropic.ToolResultBlockParam[]; hasToolUse: boolean } {
  const { employeeNameMap, employeePositionMap, posteMap } = lookups
  const shifts: ProposedShift[] = []
  const toolResults: Anthropic.ToolResultBlockParam[] = []

  const toolUses = content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')

  for (const block of toolUses) {
    const input = (block.input ?? {}) as ProposeInput
    const valid = block.name === 'propose_shift'
      && !!input.employee_id && !!input.date && !!input.start_time && !!input.end_time

    if (valid) {
      shifts.push({
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
      })
    }

    toolResults.push({
      type: 'tool_result',
      tool_use_id: block.id,
      content: valid
        ? `OK: ${input.date} ${input.start_time}-${input.end_time} pour ${employeeNameMap[input.employee_id!] ?? input.employee_id!}`
        : 'Ignoré : données de créneau incomplètes.',
      ...(valid ? {} : { is_error: true }),
    })
  }

  return { shifts, toolResults, hasToolUse: toolUses.length > 0 }
}
