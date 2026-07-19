import { describe, it, expect } from 'vitest'
import {
  scoreCandidate,
  rankCandidates,
  explainCandidate,
  type CandidateInput,
  type CandidateSignals,
} from './score'

// ── Helpers ──────────────────────────────────────────────────────────────────

const EMP: CandidateInput = { id: 'emp-1', full_name: 'Alice', position: 'Serveur', contract_type: 'CDI 35h' }

// Defaults: pas d'historique, contrat 35h, 0h planifiées → availability max,
// marketplace neutre, rotation neutre (1 demande récente).
function withDefaults(overrides: Partial<CandidateSignals> = {}): CandidateSignals {
  return {
    experienceCount: 0,
    weeklyHoursPlanned: 0,
    contractWeeklyHours: 35,
    marketplaceConfirmed: 0,
    marketplaceTotal: 0,
    recentReplacementsConfirmed: 1,
    complianceDetails: [],
    declaredAvailabilityMismatch: false,
    ...overrides,
  }
}

// ── Sub-scores ───────────────────────────────────────────────────────────────

describe('scoreCandidate — sous-scores', () => {
  it('expérience plafonnée à 10 quand le poste est défini', () => {
    const c = scoreCandidate(EMP, withDefaults({ experienceCount: 25 }), { hasPosteId: true })
    expect(c.experience_score).toBe(10)
  })

  it('expérience = 5 (neutre) quand le poste du shift n’est pas défini', () => {
    const c = scoreCandidate(EMP, withDefaults({ experienceCount: 25 }), { hasPosteId: false })
    expect(c.experience_score).toBe(5)
  })

  it('disponibilité haute quand peu d’heures sont déjà planifiées', () => {
    const c = scoreCandidate(EMP, withDefaults({ weeklyHoursPlanned: 7, contractWeeklyHours: 35 }), { hasPosteId: true })
    expect(c.availability_score).toBe(8) // 10 - (7/35)*10
  })

  it('disponibilité = 0 quand le contrat est déjà saturé', () => {
    const c = scoreCandidate(EMP, withDefaults({ weeklyHoursPlanned: 35, contractWeeklyHours: 35 }), { hasPosteId: true })
    expect(c.availability_score).toBe(0)
  })

  it('disponibilité = 0 (non négative) en cas de dépassement contrat', () => {
    const c = scoreCandidate(EMP, withDefaults({ weeklyHoursPlanned: 50, contractWeeklyHours: 35 }), { hasPosteId: true })
    expect(c.availability_score).toBe(0)
  })

  it('réactivité = 5 (neutre) sans historique marketplace', () => {
    const c = scoreCandidate(EMP, withDefaults({ marketplaceTotal: 0, marketplaceConfirmed: 0 }), { hasPosteId: true })
    expect(c.response_score).toBe(5)
  })

  it('réactivité = 10 quand toutes les candidatures ont été confirmées', () => {
    const c = scoreCandidate(EMP, withDefaults({ marketplaceTotal: 4, marketplaceConfirmed: 4 }), { hasPosteId: true })
    expect(c.response_score).toBe(10)
  })
})

// ── Compliance penalty ───────────────────────────────────────────────────────

describe('scoreCandidate — pénalité de conformité', () => {
  it('marque le warning et descend le score final', () => {
    // exp=8, avail=10 (0h planifiées), resp=5 → base = 3.2+3+1.5 = 7.7
    // pénalité 1×2 = 2 ; rotation neutre → 5.7
    const c = scoreCandidate(
      EMP,
      withDefaults({ experienceCount: 8, complianceDetails: ['Dépassement 48h semaine'] }),
      { hasPosteId: true },
    )
    expect(c.compliance_warning).toBe(true)
    expect(c.score_final).toBeCloseTo(5.7, 1)
  })

  it('cumule la pénalité quand plusieurs règles sont violées', () => {
    // exp=10, avail=10, resp=10 → base = 4+3+3 = 10
    // pénalité 2×2 = 4 ; rotation neutre → 6
    const c = scoreCandidate(
      EMP,
      withDefaults({
        experienceCount: 10,
        marketplaceTotal: 2, marketplaceConfirmed: 2,
        complianceDetails: ['Dépassement 48h semaine', 'Repos insuffisant'],
      }),
      { hasPosteId: true },
    )
    expect(c.score_final).toBe(6)
  })
})

// ── Disponibilités déclarées ─────────────────────────────────────────────────

describe('scoreCandidate — disponibilités déclarées', () => {
  it('pénalise un candidat dont le shift tombe hors de ses dispos déclarées', () => {
    // exp=8, avail=10, resp=5 → base = 3.2+3+1.5 = 7.7 ; pénalité dispo 2 → 5.7
    const c = scoreCandidate(
      EMP,
      withDefaults({ experienceCount: 8, declaredAvailabilityMismatch: true }),
      { hasPosteId: true },
    )
    expect(c.availability_mismatch).toBe(true)
    expect(c.score_final).toBeCloseTo(5.7, 1)
    expect(c.explanation).toContain('Hors dispos déclarées')
  })

  it('reste neutre quand aucune dispo n’est déclarée (mismatch=false)', () => {
    const c = scoreCandidate(EMP, withDefaults({ experienceCount: 8 }), { hasPosteId: true })
    expect(c.availability_mismatch).toBe(false)
    expect(c.explanation).not.toContain('Hors dispos')
  })
})

// ── Rotation ─────────────────────────────────────────────────────────────────

describe('scoreCandidate — rotation', () => {
  it('bonus +1 si jamais sollicité récemment', () => {
    // exp=0, avail=10, resp=5 → base = 0+3+1.5 = 4.5
    // rotation +1 → 5.5
    const c = scoreCandidate(EMP, withDefaults({ recentReplacementsConfirmed: 0 }), { hasPosteId: true })
    expect(c.score_final).toBeCloseTo(5.5, 1)
  })

  it('malus -1 si déjà sollicité 3 fois ou plus', () => {
    // base = 4.5 ; rotation -1 → 3.5
    const c = scoreCandidate(EMP, withDefaults({ recentReplacementsConfirmed: 4 }), { hasPosteId: true })
    expect(c.score_final).toBeCloseTo(3.5, 1)
  })

  it('le score final reste dans [0, 10] même avec ajustements extrêmes', () => {
    const high = scoreCandidate(
      EMP,
      withDefaults({ experienceCount: 10, marketplaceTotal: 2, marketplaceConfirmed: 2, recentReplacementsConfirmed: 0 }),
      { hasPosteId: true },
    )
    expect(high.score_final).toBeLessThanOrEqual(10)

    const low = scoreCandidate(
      EMP,
      withDefaults({ weeklyHoursPlanned: 35, marketplaceTotal: 5, marketplaceConfirmed: 0, recentReplacementsConfirmed: 5, complianceDetails: ['A', 'B', 'C'] }),
      { hasPosteId: true },
    )
    expect(low.score_final).toBeGreaterThanOrEqual(0)
  })
})

// ── Ranking ──────────────────────────────────────────────────────────────────

describe('rankCandidates', () => {
  it('place les candidats conformes avant ceux en violation, même à score plus bas', () => {
    // clean : exp=1, avail=10, resp=5 → base = 0.4+3+1.5 = 4.9
    // flagged : exp=10, avail=10, resp=5, compliance 1 → base = 4+3+1.5 = 8.5, pénalité 2 → 6.5
    // flagged a un score plus haut, mais conformité prime → clean en premier.
    const clean = scoreCandidate(EMP, withDefaults({ experienceCount: 1 }), { hasPosteId: true })
    const flagged = scoreCandidate(
      { ...EMP, id: 'emp-2' },
      withDefaults({ experienceCount: 10, complianceDetails: ['X'] }),
      { hasPosteId: true },
    )
    const ranked = rankCandidates([flagged, clean])
    expect(ranked[0].employee_id).toBe('emp-1')
    expect(ranked[1].employee_id).toBe('emp-2')
  })

  it('trie par score décroissant à conformité égale', () => {
    const a = scoreCandidate({ ...EMP, id: 'A' }, withDefaults({ experienceCount: 2 }), { hasPosteId: true })
    const b = scoreCandidate({ ...EMP, id: 'B' }, withDefaults({ experienceCount: 8 }), { hasPosteId: true })
    expect(rankCandidates([a, b]).map(c => c.employee_id)).toEqual(['B', 'A'])
  })

  it('place les candidats dans leurs dispos avant ceux hors dispos, à conformité égale', () => {
    const inWindow = scoreCandidate({ ...EMP, id: 'IN' }, withDefaults({ experienceCount: 1 }), { hasPosteId: true })
    const outWindow = scoreCandidate(
      { ...EMP, id: 'OUT' },
      withDefaults({ experienceCount: 10, declaredAvailabilityMismatch: true }),
      { hasPosteId: true },
    )
    expect(rankCandidates([outWindow, inWindow]).map(c => c.employee_id)).toEqual(['IN', 'OUT'])
  })
})

// ── Deterministic explanation ────────────────────────────────────────────────

describe('explainCandidate', () => {
  it('signale la conformité en premier quand elle est en alerte', () => {
    const s = explainCandidate({
      experience_score: 5, availability_score: 5, response_score: 5,
      contract_type: 'CDI 35h', hasPosteId: true, hasComplianceWarning: true,
      availabilityMismatch: false,
      recentReplacementsConfirmed: 1,
    })
    expect(s.startsWith('Conformité')).toBe(true)
  })

  it('mentionne "Jamais fait ce poste" pour un candidat sans expérience sur le poste', () => {
    const s = explainCandidate({
      experience_score: 0, availability_score: 8, response_score: 5,
      contract_type: null, hasPosteId: true, hasComplianceWarning: false,
      availabilityMismatch: false,
      recentReplacementsConfirmed: 1,
    })
    expect(s).toContain('Jamais fait ce poste')
  })

  it('mentionne le contrat Extra', () => {
    const s = explainCandidate({
      experience_score: 8, availability_score: 8, response_score: 5,
      contract_type: 'Extra', hasPosteId: true, hasComplianceWarning: false,
      availabilityMismatch: false,
      recentReplacementsConfirmed: 1,
    })
    expect(s).toContain('Extra')
  })
})
