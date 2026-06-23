// Scoring déterministe pour la recherche de remplaçant.
// Extrait de /api/ai/replacement pour rester testable et auditable.

// ── Public types ─────────────────────────────────────────────────────────────

export type CandidateInput = {
  id: string
  full_name: string | null
  position: string | null
  contract_type: string | null
}

// Signaux bruts par candidat, agrégés en amont à partir de la base.
export type CandidateSignals = {
  experienceCount: number              // shifts sur le même poste, 90 derniers jours
  weeklyHoursPlanned: number           // heures déjà planifiées cette semaine
  contractWeeklyHours: number | null   // heures contractuelles
  marketplaceConfirmed: number         // candidatures marketplace confirmées, 60j
  marketplaceTotal: number             // candidatures marketplace totales, 60j
  recentReplacementsConfirmed: number  // remplacements pris au cours des 30 derniers jours
  complianceDetails: string[]          // violations identifiées si ce shift lui est attribué
}

export type CandidateScore = {
  employee_id: string
  full_name: string
  position: string | null
  contract_type: string | null
  experience_score: number
  availability_score: number
  response_score: number
  score_final: number
  weekly_hours_planned: number
  contract_weekly_hours: number | null
  compliance_warning: boolean
  compliance_details: string[]
  explanation: string
}

export type ShiftCtx = {
  hasPosteId: boolean
}

// Pondérations explicites (somme = 1).
const W_EXP = 0.4
const W_AVAIL = 0.3
const W_RESP = 0.3

// Pénalité de score par violation de conformité (le candidat reste listé,
// mais descend en bas du classement — voir rankCandidates).
const COMPLIANCE_PENALTY = 2

// Rotation : on borne le bonus/malus à ±1 point sur 10.
function rotationAdjustment(recent: number): number {
  if (recent === 0) return +1
  if (recent >= 3) return -1
  return 0
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function safe(n: number, fallback = 5): number {
  return Number.isFinite(n) ? n : fallback
}

// ── Scoring per candidate ────────────────────────────────────────────────────

export function scoreCandidate(
  emp: CandidateInput,
  signals: CandidateSignals,
  ctx: ShiftCtx,
): CandidateScore {
  // Expérience : 0–10. Sans poste défini sur le shift, valeur neutre.
  const experience_score = ctx.hasPosteId
    ? Math.min(10, signals.experienceCount)
    : 5

  // Disponibilité : 0–10. Sans contrat connu, valeur neutre.
  let availability_score: number
  if (!signals.contractWeeklyHours) {
    availability_score = 5
  } else {
    availability_score = clamp(
      10 - (signals.weeklyHoursPlanned / signals.contractWeeklyHours) * 10,
      0, 10,
    )
  }

  // Réactivité : 0–10. Sans historique marketplace, valeur neutre.
  const response_score = signals.marketplaceTotal === 0
    ? 5
    : (signals.marketplaceConfirmed / signals.marketplaceTotal) * 10

  // Score composite + ajustements compliance et rotation.
  const base = safe(experience_score) * W_EXP
             + safe(availability_score) * W_AVAIL
             + safe(response_score) * W_RESP

  const compliancePenalty = signals.complianceDetails.length * COMPLIANCE_PENALTY
  const rotationDelta = rotationAdjustment(signals.recentReplacementsConfirmed)
  const score_final = clamp(base - compliancePenalty + rotationDelta, 0, 10)

  const round1 = (n: number) => Math.round(n * 10) / 10

  return {
    employee_id: emp.id,
    full_name: emp.full_name ?? 'Inconnu',
    position: emp.position,
    contract_type: emp.contract_type,
    experience_score: round1(experience_score),
    availability_score: round1(availability_score),
    response_score: round1(response_score),
    score_final: round1(score_final),
    weekly_hours_planned: round1(signals.weeklyHoursPlanned),
    contract_weekly_hours: signals.contractWeeklyHours,
    compliance_warning: signals.complianceDetails.length > 0,
    compliance_details: signals.complianceDetails,
    explanation: explainCandidate({
      experience_score, availability_score, response_score,
      contract_type: emp.contract_type,
      hasPosteId: ctx.hasPosteId,
      hasComplianceWarning: signals.complianceDetails.length > 0,
      recentReplacementsConfirmed: signals.recentReplacementsConfirmed,
    }),
  }
}

// ── Ranking — composite sort: compliance OK first, then score desc ───────────

export function rankCandidates(scored: CandidateScore[]): CandidateScore[] {
  return [...scored].sort((a, b) => {
    if (a.compliance_warning !== b.compliance_warning) {
      return a.compliance_warning ? 1 : -1
    }
    return b.score_final - a.score_final
  })
}

// ── Deterministic one-line explanation (replaces the Haiku gloss) ────────────

type ExplainInput = {
  experience_score: number
  availability_score: number
  response_score: number
  contract_type: string | null
  hasPosteId: boolean
  hasComplianceWarning: boolean
  recentReplacementsConfirmed: number
}

export function explainCandidate(c: ExplainInput): string {
  const parts: string[] = []

  // Conformité d'abord, c'est le signal prioritaire pour le manager.
  if (c.hasComplianceWarning) parts.push('Conformité à vérifier')

  // Expérience.
  if (c.hasPosteId) {
    if (c.experience_score >= 7) parts.push(`Connaît bien ce poste (${Math.round(c.experience_score)}×)`)
    else if (c.experience_score >= 3) parts.push(`A déjà fait ce poste (${Math.round(c.experience_score)}×)`)
    else if (c.experience_score >= 1) parts.push('A fait ce poste rarement')
    else parts.push('Jamais fait ce poste')
  }

  // Disponibilité.
  if (c.availability_score >= 7) parts.push('Très disponible')
  else if (c.availability_score >= 4) parts.push('Disponible')
  else if (c.availability_score < 4) parts.push('Peu de marge contrat')

  // Réactivité (uniquement si on a des données).
  if (c.response_score >= 7) parts.push('Répond souvent')
  else if (c.response_score <= 3) parts.push('Peu réactif')

  // Rotation.
  if (c.recentReplacementsConfirmed === 0) parts.push('Pas sollicité récemment')
  else if (c.recentReplacementsConfirmed >= 3) parts.push('Déjà sollicité ce mois-ci')

  // Type de contrat (info utile pour les Extras).
  if (c.contract_type === 'Extra') parts.push('Contrat Extra')

  return parts.slice(0, 4).join(' · ')  // max 4 segments, pour rester compact
}
