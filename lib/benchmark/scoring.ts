// Cœur de l'algorithme de benchmark — fonctions PURES, testables sans BDD.
// Calcule des scores absolus 0–100 (barème métier) puis la position percentile
// de chaque établissement dans la cohorte.

import type {
  AbsoluteScores,
  BenchmarkScore,
  BenchmarkWeights,
  EstablishmentMetrics,
} from './types'

// Barème initial — heuristiques à recalibrer une fois des données réelles
// observées. Centralisé ici pour rester facile à ajuster.
export const DEFAULT_WEIGHTS: BenchmarkWeights = {
  compliance: {
    critical: 60, // points retirés par alerte critique active / employé
    warning: 20,
    lateness: 15, // par retard injustifié (30 j) / employé
  },
  planning: {
    publishRatio: 0.5, // part des shifts publiés (vs draft)
    marketplaceFillRatio: 0.3, // trous comblés vs ouverts
    leaveBacklog: 0.2, // demandes de congé en attente / employé
  },
  global: {
    planning: 0.5,
    compliance: 0.5,
  },
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n))
const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Scores absolus 0–100 pour un établissement.
 * - Conformité : 100 moins des pénalités normalisées par employé.
 * - Planning : moyenne pondérée de 3 sous-signaux ramenés sur 0–1.
 * - Global : mix planning / conformité.
 */
export function computeAbsoluteScores(
  m: EstablishmentMetrics,
  weights: BenchmarkWeights = DEFAULT_WEIGHTS,
): AbsoluteScores {
  const hc = Math.max(m.headcount, 1) // évite la division par zéro

  // ── Conformité ──────────────────────────────────────────────────────────
  const compliancePenalty =
    weights.compliance.critical * (m.critical_alerts / hc) +
    weights.compliance.warning * (m.warning_alerts / hc) +
    weights.compliance.lateness * (m.unjustified_lateness_30d / hc)
  const compliance = clamp(100 - compliancePenalty)

  // ── Planning (sous-signaux 0–1, 1 = optimal) ─────────────────────────────
  // Pas de shift sur la période → rien à reprocher côté publication.
  const publishRatio = m.shifts_30d > 0 ? m.published_shifts_30d / m.shifts_30d : 1
  const marketplaceTotal = m.open_marketplace_slots + m.filled_marketplace_slots_30d
  const marketplaceFillRatio = marketplaceTotal > 0 ? m.filled_marketplace_slots_30d / marketplaceTotal : 1
  const leaveBacklog = 1 - clamp(m.pending_leaves / hc, 0, 1)

  const pw = weights.planning
  const planningWeightSum = pw.publishRatio + pw.marketplaceFillRatio + pw.leaveBacklog
  const planning = clamp(
    (100 *
      (pw.publishRatio * publishRatio +
        pw.marketplaceFillRatio * marketplaceFillRatio +
        pw.leaveBacklog * leaveBacklog)) /
      planningWeightSum,
  )

  // ── Global ───────────────────────────────────────────────────────────────
  const gw = weights.global
  const global = clamp((gw.planning * planning + gw.compliance * compliance) / (gw.planning + gw.compliance))

  return { planning: round2(planning), compliance: round2(compliance), global: round2(global) }
}

/**
 * Rang percentile (0–100) d'une valeur dans un échantillon : part des autres
 * éléments strictement inférieurs. Le meilleur obtient 100, le pire 0 ;
 * cohorte d'un seul élément → 100.
 */
function percentileRank(value: number, all: number[]): number {
  if (all.length <= 1) return 100
  const below = all.filter((v) => v < value).length
  return round2((below / (all.length - 1)) * 100)
}

/**
 * Calcule les percentiles de chaque dimension pour une cohorte d'établissements
 * déjà notés en absolu. Préserve l'ordre d'entrée.
 */
export function computePercentiles(
  scores: (AbsoluteScores & { establishment_id: string })[],
): BenchmarkScore[] {
  const planningAll = scores.map((s) => s.planning)
  const complianceAll = scores.map((s) => s.compliance)
  const globalAll = scores.map((s) => s.global)

  return scores.map((s) => ({
    ...s,
    planning_percentile: percentileRank(s.planning, planningAll),
    compliance_percentile: percentileRank(s.compliance, complianceAll),
    global_percentile: percentileRank(s.global, globalAll),
  }))
}

/** Pipeline complet : métriques brutes → scores absolus + percentiles. */
export function scoreCohort(
  metrics: EstablishmentMetrics[],
  weights: BenchmarkWeights = DEFAULT_WEIGHTS,
): BenchmarkScore[] {
  const absolute = metrics.map((m) => ({
    establishment_id: m.establishment_id,
    ...computeAbsoluteScores(m, weights),
  }))
  return computePercentiles(absolute)
}
