import { describe, it, expect } from 'vitest'
import { collectProposedShifts, type ShiftLookups } from './plan-tools'
import type { ProposedShift } from './solver'

const lookups: ShiftLookups = {
  employeeNameMap: { e1: 'Alice', e2: 'Bob' },
  employeePositionMap: { e1: 'Serveur', e2: 'Cuisinier' },
  posteMap: { p1: { name: 'Salle' } },
}

// Simule les blocs de contenu renvoyés par l'API Anthropic.
// `caller` (invocation directe du modèle) est requis par le type ToolUseBlock
// du SDK depuis sa dernière version.
function toolUse(id: string, input: Record<string, unknown>, name = 'propose_shift') {
  return { type: 'tool_use' as const, id, name, input, caller: { type: 'direct' as const } }
}
function text(t: string) {
  return { type: 'text' as const, text: t }
}
function priorShift(employee_id: string, date: string, start_time: string, end_time: string, break_minutes = 0): ProposedShift {
  return { employee_id, employee_name: employee_id, date, start_time, end_time, break_minutes, poste_id: null, position: null, notes: null }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const collect = (content: any[], priorShifts: ProposedShift[] = []) => collectProposedShifts(content, lookups, priorShifts)

describe('collectProposedShifts — un tool_result par tool_use (corrige le 400)', () => {
  it('répond à CHAQUE tool_use, y compris en scénario max_tokens (plusieurs appels)', () => {
    // Reproduit la cause du bug : une réponse stoppée sur max_tokens contenant
    // de nombreux tool_use. Chaque id DOIT recevoir un tool_result.
    // 12 employés distincts (et non 12 fois le même) pour ne pas déclencher la
    // vérification de conformité — non l'objet de ce test.
    const content = Array.from({ length: 12 }, (_, i) =>
      toolUse(`toolu_${i}`, { employee_id: `e${i}`, date: '2026-06-22', start_time: '09:00', end_time: '17:00', break_minutes: 30 }),
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
      toolUse('ok', { employee_id: 'e1', date: '2026-06-22', start_time: '09:00', end_time: '17:00', break_minutes: 30 }),
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
      toolUse('a', { employee_id: 'e1', date: '2026-06-22', start_time: '09:00', end_time: '17:00', break_minutes: 30, poste_id: 'p1' }),
      toolUse('b', { employee_id: 'e2', date: '2026-06-22', start_time: '10:00', end_time: '18:00', break_minutes: 30 }),
    ])
    expect(shifts[0].employee_name).toBe('Alice')
    expect(shifts[0].position).toBe('Salle')        // depuis poste_id
    expect(shifts[1].position).toBe('Cuisinier')    // repli position employé
  })
})

describe('collectProposedShifts — rejette en temps réel les créneaux non conformes', () => {
  it('rejette un créneau qui dépasse seul les 10h/jour, sans l\'ajouter aux shifts', () => {
    const { shifts, toolResults } = collect([
      toolUse('a', { employee_id: 'e1', date: '2026-06-22', start_time: '08:00', end_time: '20:00', break_minutes: 30 }), // 11h30 net
    ])
    expect(shifts).toHaveLength(0)
    expect(toolResults[0].is_error).toBe(true)
    expect(String(toolResults[0].content)).toContain('REJETÉ')
    expect(String(toolResults[0].content)).toContain('Durée quotidienne excessive')
  })

  it('rejette un créneau qui casse le repos de 11h avec un créneau déjà accepté', () => {
    // Créneau accepté : lundi 15:00–23:00. Candidat : mardi 06:00–12:00 → 7h de repos < 11h.
    const prior = [priorShift('e1', '2026-06-22', '15:00', '23:00', 30)]
    const { shifts, toolResults } = collect([
      toolUse('a', { employee_id: 'e1', date: '2026-06-23', start_time: '06:00', end_time: '12:00', break_minutes: 0 }),
    ], prior)
    expect(shifts).toHaveLength(0)
    expect(toolResults[0].is_error).toBe(true)
    expect(String(toolResults[0].content)).toContain('REJETÉ')
    expect(String(toolResults[0].content)).toContain('Repos quotidien insuffisant')
  })

  it('rejette le 7ème jour consécutif (règle cumulative détectée via avant/après)', () => {
    const prior = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20']
      .map(d => priorShift('e1', d, '09:00', '13:00', 0)) // 4h/jour, aucune autre règle déclenchée
    const { shifts, toolResults } = collect([
      toolUse('a', { employee_id: 'e1', date: '2026-06-21', start_time: '09:00', end_time: '13:00', break_minutes: 0 }),
    ], prior)
    expect(shifts).toHaveLength(0)
    expect(toolResults[0].is_error).toBe(true)
    expect(String(toolResults[0].content)).toContain('Jours consécutifs')
  })

  it('accepte un créneau conforme malgré des créneaux déjà acceptés pour un autre employé', () => {
    const prior = [priorShift('e2', '2026-06-22', '08:00', '20:00', 30)] // non conforme mais pour un AUTRE employé
    const { shifts, toolResults } = collect([
      toolUse('a', { employee_id: 'e1', date: '2026-06-22', start_time: '09:00', end_time: '17:00', break_minutes: 30 }),
    ], prior)
    expect(shifts).toHaveLength(1)
    expect(toolResults[0].is_error).toBeUndefined()
    expect(String(toolResults[0].content)).toContain('OK')
  })

  it('plafonne les rejets répétés du même créneau : accepté malgré la violation après plusieurs essais', () => {
    // 08:00-20:00 sans pause = 11h30 net > 10h (hours_daily_max), toujours rejeté.
    const badInput = { employee_id: 'e1', date: '2026-06-22', start_time: '08:00', end_time: '20:00', break_minutes: 0 }
    const rejectionCounts = new Map<string, number>()

    const first = collectProposedShifts([toolUse('a', badInput)], lookups, [], undefined, rejectionCounts)
    expect(first.shifts).toHaveLength(0)
    expect(first.toolResults[0].is_error).toBe(true)

    const second = collectProposedShifts([toolUse('b', badInput)], lookups, [], undefined, rejectionCounts)
    expect(second.shifts).toHaveLength(0)
    expect(second.toolResults[0].is_error).toBe(true)

    // Après MAX_REJECTIONS_PER_SLOT essais infructueux, on n'insiste plus.
    const third = collectProposedShifts([toolUse('c', badInput)], lookups, [], undefined, rejectionCounts)
    expect(third.shifts).toHaveLength(1)
    expect(third.toolResults[0].is_error).toBeUndefined()
    expect(String(third.toolResults[0].content)).toContain('non-conformité persistante')
  })
})
