import { describe, it, expect } from 'vitest'
import { collectProposedShifts, type ShiftLookups } from './plan-tools'

const lookups: ShiftLookups = {
  employeeNameMap: { e1: 'Alice', e2: 'Bob' },
  employeePositionMap: { e1: 'Serveur', e2: 'Cuisinier' },
  posteMap: { p1: { name: 'Salle' } },
}

// Simule les blocs de contenu renvoyés par l'API Anthropic.
function toolUse(id: string, input: Record<string, unknown>, name = 'propose_shift') {
  return { type: 'tool_use' as const, id, name, input }
}
function text(t: string) {
  return { type: 'text' as const, text: t }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const collect = (content: any[]) => collectProposedShifts(content, lookups)

describe('collectProposedShifts — un tool_result par tool_use (corrige le 400)', () => {
  it('répond à CHAQUE tool_use, y compris en scénario max_tokens (plusieurs appels)', () => {
    // Reproduit la cause du bug : une réponse stoppée sur max_tokens contenant
    // de nombreux tool_use. Chaque id DOIT recevoir un tool_result.
    const content = Array.from({ length: 12 }, (_, i) =>
      toolUse(`toolu_${i}`, { employee_id: 'e1', date: '2026-06-22', start_time: '09:00', end_time: '17:00', break_minutes: 30 }),
    )
    const { toolResults, shifts } = collect(content)
    expect(toolResults).toHaveLength(12)
    expect(shifts).toHaveLength(12)
    // Tous les ids de tool_use sont couverts, sans doublon.
    const resultIds = new Set(toolResults.map(r => r.tool_use_id))
    expect(resultIds).toEqual(new Set(content.map(c => c.id)))
  })

  it('produit un tool_result is_error pour un appel incomplet (input tronqué par max_tokens)', () => {
    const content = [
      toolUse('ok', { employee_id: 'e1', date: '2026-06-22', start_time: '09:00', end_time: '17:00' }),
      toolUse('partial', { employee_id: 'e2' }), // input tronqué → invalide
    ]
    const { toolResults, shifts } = collect(content)
    expect(toolResults).toHaveLength(2) // les DEUX ids répondus
    expect(shifts).toHaveLength(1)      // seul le valide devient un shift
    const partial = toolResults.find(r => r.tool_use_id === 'partial')!
    expect(partial.is_error).toBe(true)
  })

  it('hasToolUse=false quand la réponse ne contient que du texte (fin de génération)', () => {
    const { hasToolUse, toolResults, shifts } = collect([text('Planning terminé.')])
    expect(hasToolUse).toBe(false)
    expect(toolResults).toHaveLength(0)
    expect(shifts).toHaveLength(0)
  })

  it('enrichit le shift : nom employé, poste via poste_id, repli sur la position employé', () => {
    const { shifts } = collect([
      toolUse('a', { employee_id: 'e1', date: '2026-06-22', start_time: '09:00', end_time: '17:00', poste_id: 'p1' }),
      toolUse('b', { employee_id: 'e2', date: '2026-06-22', start_time: '10:00', end_time: '18:00' }),
    ])
    expect(shifts[0].employee_name).toBe('Alice')
    expect(shifts[0].position).toBe('Salle')        // depuis poste_id
    expect(shifts[1].position).toBe('Cuisinier')    // repli position employé
  })
})
