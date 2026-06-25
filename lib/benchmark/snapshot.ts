// Writer du benchmark : lit la vue cross-tenant establishment_metrics via le
// client service-role, calcule les scores et upsert un snapshot par établissement.
//
// NON planifié : aucune wiring cron/endpoint dans ce lot. La future feature
// l'appellera (cron quotidien, route admin, tool IA…).

import { supabaseAdmin } from '@/lib/supabase/admin'
import { scoreCohort } from './scoring'
import type { BenchmarkWeights, EstablishmentMetrics } from './types'
import { DEFAULT_WEIGHTS } from './scoring'

/** Date du jour au format ISO (YYYY-MM-DD). */
function today(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Calcule et stocke un snapshot de benchmark pour TOUS les établissements.
 * Idempotent par (establishment_id, period_start) : ré-exécution = upsert.
 *
 * @param periodStart  période du snapshot (défaut : aujourd'hui)
 * @param weights      barème (défaut : DEFAULT_WEIGHTS)
 * @returns nombre d'établissements notés
 */
export async function computeAndStoreBenchmarks(
  periodStart: string = today(),
  weights: BenchmarkWeights = DEFAULT_WEIGHTS,
): Promise<number> {
  const { data, error } = await supabaseAdmin.from('establishment_metrics').select('*')
  if (error) throw new Error(`Lecture establishment_metrics échouée : ${error.message}`)

  const metrics = (data ?? []) as EstablishmentMetrics[]
  if (metrics.length === 0) return 0

  const scored = scoreCohort(metrics, weights)
  const metricsById = new Map(metrics.map((m) => [m.establishment_id, m]))

  const rows = scored.map((s) => ({
    establishment_id: s.establishment_id,
    period_start: periodStart,
    planning_score: s.planning,
    compliance_score: s.compliance,
    global_score: s.global,
    planning_percentile: s.planning_percentile,
    compliance_percentile: s.compliance_percentile,
    global_percentile: s.global_percentile,
    metrics: metricsById.get(s.establishment_id) ?? {},
    computed_at: new Date().toISOString(),
  }))

  const { error: upsertError } = await supabaseAdmin
    .from('establishment_benchmark_scores')
    .upsert(rows, { onConflict: 'establishment_id,period_start' })
  if (upsertError) throw new Error(`Upsert benchmark échoué : ${upsertError.message}`)

  return rows.length
}
