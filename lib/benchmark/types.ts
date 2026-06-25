// Types de la fondation « benchmark établissements ».
// Voir supabase/migrations/071_establishment_benchmark.sql

/** Métriques brutes d'un établissement (une ligne de la vue establishment_metrics). */
export interface EstablishmentMetrics {
  establishment_id: string
  headcount: number
  // Conformité
  active_alerts: number
  critical_alerts: number
  warning_alerts: number
  unjustified_lateness_30d: number
  // Planning
  shifts_30d: number
  published_shifts_30d: number
  open_marketplace_slots: number
  filled_marketplace_slots_30d: number
  pending_leaves: number
}

/** Scores absolus 0–100 pour un établissement. */
export interface AbsoluteScores {
  planning: number
  compliance: number
  global: number
}

/** Scores + position relative (percentile 0–100) dans la cohorte. */
export interface BenchmarkScore extends AbsoluteScores {
  establishment_id: string
  planning_percentile: number
  compliance_percentile: number
  global_percentile: number
}

/** Poids du barème de scoring. Exportés pour pouvoir recalibrer facilement. */
export interface BenchmarkWeights {
  // Pénalités conformité (points retirés à 100, normalisés par employé)
  compliance: {
    critical: number
    warning: number
    lateness: number
  }
  // Sous-signaux planning (somme libre, repondérée en interne)
  planning: {
    publishRatio: number
    marketplaceFillRatio: number
    leaveBacklog: number
  }
  // Mix planning / conformité pour le score global
  global: {
    planning: number
    compliance: number
  }
}
