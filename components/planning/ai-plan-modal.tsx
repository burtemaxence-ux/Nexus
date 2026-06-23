'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Loader2, CheckCircle, ChevronRight, Wand2, TrendingUp } from 'lucide-react'
import { type Profile, type Poste, type Shift } from '@/types'
import { type ProposedShift } from '@/app/api/ai/plan/route'

type ModalPhase = 'idle' | 'generating' | 'applying' | 'done'

const SUGGESTIONS = [
  '3 serveurs chaque soir 18h–23h, fermé dimanche',
  'Planning léger en semaine, renforcé week-end',
  'Couvrir ouverture et fermeture chaque jour',
  'Répartir équitablement entre tous les employés',
]

interface AiPlanModalProps {
  weekMonday: string
  weekLabel: string
  employees: Profile[]
  postes: Poste[]
  existingShifts: Shift[]
  onSuccess: () => void
  onClose: () => void
}

export function AiPlanModal({ weekMonday, weekLabel, employees, postes, onSuccess, onClose }: AiPlanModalProps) {
  const [phase, setPhase] = useState<ModalPhase>('idle')
  const [instructions, setInstructions] = useState('')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(0)
  const [applyTotal, setApplyTotal] = useState(0)

  // Copilote de productivité : prévision de CA + cible coût/CA.
  const [forecastTotal, setForecastTotal] = useState(0)
  const [historicalRatioPct, setHistoricalRatioPct] = useState<number | null>(null)
  const [targetBasis, setTargetBasis] = useState<'history' | 'sector'>('sector')
  const [targetPct, setTargetPct] = useState('')
  const [result, setResult] = useState<{ targetPct: number; estimatedRatioPct: number | null; estimatedCost: number; forecastTotal: number; historicalRatioPct: number | null } | null>(null)

  // Pré-remplit la cible suggérée et le CA prévu à l'ouverture (sans appel IA).
  useEffect(() => {
    fetch(`/api/ai/plan?week_monday=${weekMonday}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return
        setForecastTotal(d.forecastTotal ?? 0)
        setHistoricalRatioPct(d.historicalRatioPct ?? null)
        setTargetBasis(d.targetBasis ?? 'sector')
        setTargetPct(String(d.suggestedTargetPct ?? 30))
      })
      .catch(() => {})
  }, [weekMonday])

  // Crée tous les shifts proposés en brouillon. La conformité n'est PAS
  // vérifiée ici : le planning s'applique directement, le manager vérifie
  // ensuite via le bouton « Vérifier » du planning (cases en rouge).
  async function applyShifts(toApply: ProposedShift[]) {
    setPhase('applying')
    setApplied(0)
    setApplyTotal(toApply.length)
    let count = 0
    for (const shift of toApply) {
      await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: shift.employee_id,
          date: shift.date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          break_minutes: shift.break_minutes,
          poste_id: shift.poste_id,
          notes: shift.notes,
          status: 'draft',
        }),
      })
      count++
      setApplied(count)
    }
    setPhase('done')
    onSuccess()
  }

  async function generate() {
    setPhase('generating')
    setError(null)
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_monday: weekMonday, context: instructions, target_ratio: targetPct ? Number(targetPct) : undefined }),
      })
      // Body en texte d'abord : si JSON.parse échoue (504 Vercel renvoie du
      // HTML/vide), on remonte le statut HTTP plutôt qu'un « Erreur réseau » opaque.
      const text = await res.text()
      let data: {
        shifts?: ProposedShift[]; summary?: string; error?: string
        targetPct?: number; estimatedRatioPct?: number | null; estimatedCost?: number
        forecastTotal?: number; historicalRatioPct?: number | null
      } = {}
      try { data = text ? JSON.parse(text) : {} } catch {
        if (res.status === 504 || res.status === 408) {
          setError("La génération IA a dépassé le délai. Réessayez ou utilisez l'algorithme déterministe (Réglages › Planning).")
        } else {
          setError(`Réponse serveur invalide (HTTP ${res.status}).`)
        }
        setPhase('idle')
        return
      }
      if (!res.ok || data.error) {
        setError(data.error ?? 'Erreur lors de la génération')
        setPhase('idle')
        return
      }
      const shifted = data.shifts ?? []
      setSummary(data.summary ?? '')
      if ((data.forecastTotal ?? 0) > 0) {
        setResult({
          targetPct: data.targetPct ?? Number(targetPct || 0),
          estimatedRatioPct: data.estimatedRatioPct ?? null,
          estimatedCost: data.estimatedCost ?? 0,
          forecastTotal: data.forecastTotal ?? 0,
          historicalRatioPct: data.historicalRatioPct ?? null,
        })
      }
      if (shifted.length === 0) {
        setApplied(0); setApplyTotal(0); setPhase('done')
        return
      }
      // Application automatique — pas d'étape de vérification case par case.
      await applyShifts(shifted)
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
      setPhase('idle')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)', maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
              Auto-planning IA
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
              {weekLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            title="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">

          {/* ── Idle ── */}
          {phase === 'idle' && (
            <div className="space-y-4">
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                Décrivez vos besoins pour la semaine. L&apos;IA génère et applique un planning complet en brouillon — vous le vérifiez et l&apos;ajustez ensuite sur le planning.
              </p>

              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="Ex : J'ai besoin de 3 serveurs le week-end, Hugo ne peut pas le lundi, planning léger mercredi…"
                rows={4}
                className="w-full text-[13px] rounded-xl px-4 py-3 resize-none focus:outline-none"
                style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}
              />

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Suggestions rapides
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setInstructions(s)}
                      className="text-[12px] px-3 py-1.5 rounded-lg transition-colors"
                      style={{ border: '0.5px solid var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-page)' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Copilote de productivité — visible seulement si du CA est saisi */}
              {forecastTotal > 0 && (
                <div className="rounded-xl p-3.5" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <TrendingUp className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>Productivité</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        CA prévu cette semaine : <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>~{forecastTotal.toLocaleString('fr-FR')} €</span>
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        {targetBasis === 'history'
                          ? `Cible basée sur votre historique${historicalRatioPct != null ? ` (moyenne récente ${historicalRatioPct} %)` : ''}`
                          : 'Cible estimée selon votre type d’établissement'}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                      Cible coût/CA
                      <span className="relative">
                        <input
                          type="number" min={5} max={80} step={1}
                          value={targetPct}
                          onChange={e => setTargetPct(e.target.value)}
                          className="w-16 text-right rounded-lg pl-2 pr-5 py-1 text-[13px] focus:outline-none"
                          style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>%</span>
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                {employees.length} employés actifs · {postes.length} postes
              </p>

              {error && (
                <p className="text-[13px]" style={{ color: 'var(--danger)' }}>{error}</p>
              )}
            </div>
          )}

          {/* ── Generating ── */}
          {phase === 'generating' && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
                  <Sparkles className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                </div>
                <div className="absolute -bottom-1 -right-1">
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent)' }} />
                </div>
              </div>
              <div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  Génération en cours…
                </p>
                <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  L&apos;IA analyse les contraintes et construit votre planning
                </p>
              </div>
            </div>
          )}

          {/* ── Applying ── */}
          {phase === 'applying' && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
                <Wand2 className="h-5 w-5" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  Application du planning…
                </p>
                <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {applied} / {applyTotal} créés
                </p>
                <div className="mt-3 h-1.5 w-48 rounded-full overflow-hidden mx-auto" style={{ backgroundColor: 'var(--border)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${applyTotal > 0 ? (applied / applyTotal) * 100 : 0}%`,
                      backgroundColor: 'var(--accent)',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Done (récap) ── */}
          {phase === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                <CheckCircle className="h-5 w-5" style={{ color: 'var(--success)' }} />
              </div>
              <div className="max-w-sm">
                <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {applied > 0 ? 'Planning appliqué !' : 'Aucun shift à créer'}
                </p>
                <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {applied > 0
                    ? `${applied} shift${applied > 1 ? 's' : ''} ajouté${applied > 1 ? 's' : ''} en mode brouillon.`
                    : 'L’IA n’a proposé aucun shift pour ces critères.'}
                </p>
                {result && result.estimatedRatioPct != null && (() => {
                  const r = result.estimatedRatioPct
                  const color = r <= result.targetPct ? 'var(--success)' : r <= result.targetPct + 3 ? 'var(--warning)' : 'var(--danger)'
                  return (
                    <div className="rounded-xl p-3.5 mt-3 text-left" style={{ border: `0.5px solid ${color}`, backgroundColor: 'var(--bg-page)' }}>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Coût main d&apos;œuvre / CA estimé</span>
                        <span className="text-[20px] font-bold tabular-nums" style={{ color }}>{r} %</span>
                      </div>
                      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        <span>Cible {result.targetPct} %</span>
                        <span>· Masse salariale ~{result.estimatedCost.toLocaleString('fr-FR')} €</span>
                        <span>· CA prévu ~{result.forecastTotal.toLocaleString('fr-FR')} €</span>
                        {result.historicalRatioPct != null && <span>· Moyenne récente {result.historicalRatioPct} %</span>}
                      </div>
                    </div>
                  )
                })()}
                {summary && (
                  <div
                    className="rounded-xl p-3 mt-3 text-[12px] leading-relaxed whitespace-pre-wrap text-left"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
                  >
                    {summary}
                  </div>
                )}
                <p className="text-[12px] mt-3" style={{ color: 'var(--text-tertiary)' }}>
                  Utilisez « Vérifier » sur le planning pour repérer les éventuelles infractions (cases en rouge), puis publiez.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 flex items-center gap-3 flex-shrink-0"
          style={{ borderTop: '0.5px solid var(--border)', justifyContent: phase === 'idle' ? 'space-between' : 'center' }}
        >
          {phase === 'idle' && (
            <>
              <button onClick={onClose} className="btn-secondary text-[13px]">Annuler</button>
              <button
                onClick={generate}
                disabled={employees.length === 0}
                className="btn-primary flex items-center gap-2 text-[13px]"
                style={{ opacity: employees.length === 0 ? 0.6 : 1 }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Générer le planning
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {phase === 'generating' && (
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              Patientez, cela peut prendre 15–30 secondes…
            </p>
          )}

          {phase === 'applying' && (
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              Ne fermez pas cette fenêtre…
            </p>
          )}

          {phase === 'done' && (
            <button onClick={onClose} className="btn-primary w-full text-[13px]">Fermer</button>
          )}
        </div>
      </div>
    </div>
  )
}
