'use client'

import { useState, useMemo } from 'react'
import { X, Sparkles, Loader2, CheckCircle, RefreshCw, ChevronRight, Wand2, AlertTriangle } from 'lucide-react'
import { type Profile, type Poste, type Shift } from '@/types'
import { type ProposedShift } from '@/app/api/ai/plan/route'
import { checkCompliance, type ShiftRecord, type Violation, RULES } from '@/lib/compliance/rules'

type ModalPhase = 'idle' | 'generating' | 'preview' | 'applying' | 'done'

const SUGGESTIONS = [
  '3 serveurs chaque soir 18h–23h, fermé dimanche',
  'Planning léger en semaine, renforcé week-end',
  'Couvrir ouverture et fermeture chaque jour',
  'Répartir équitablement entre tous les employés',
]

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtTime(t: string) { return t.slice(0, 5) }

interface AiPlanModalProps {
  weekMonday: string
  weekLabel: string
  employees: Profile[]
  postes: Poste[]
  existingShifts: Shift[]
  onSuccess: () => void
  onClose: () => void
}

export function AiPlanModal({ weekMonday, weekLabel, employees, postes, existingShifts, onSuccess, onClose }: AiPlanModalProps) {
  const [phase, setPhase] = useState<ModalPhase>('idle')
  const [instructions, setInstructions] = useState('')
  const [proposedShifts, setProposedShifts] = useState<ProposedShift[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [summary, setSummary] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(0)
  const [applyTotal, setApplyTotal] = useState(0)

  // Employee id → name (existing shifts only carry ids; used for alert labels).
  const employeeNameById = useMemo(
    () => Object.fromEntries(employees.map(e => [e.id, e.full_name ?? e.email ?? e.id])),
    [employees]
  )

  // Compliance alerts introduced by the SELECTED proposal, on top of the shifts
  // already placed this week. Same engine (checkCompliance) as the shift editor,
  // so what the AI preview flags is exactly what gets enforced afterwards.
  const violations = useMemo<Violation[]>(() => {
    if (phase !== 'preview') return []
    const toRecord = (
      s: { employee_id: string; date: string; start_time: string; end_time: string; break_minutes: number },
      id: string,
    ): ShiftRecord => ({
      id,
      employeeId: s.employee_id,
      date: s.date,
      startTime: s.start_time.slice(0, 5),
      endTime: s.end_time.slice(0, 5),
      breakMinutes: s.break_minutes ?? 0,
    })
    const existing = existingShifts.map((s, i) => toRecord(s, `cur-${i}`))
    const selected = proposedShifts.filter((_, i) => selectedIndices.has(i)).map((s, i) => toRecord(s, `prop-${i}`))
    const baseline = checkCompliance(existing)
    const all = checkCompliance([...existing, ...selected])
    return all.filter(v => !baseline.some(b => b.ruleId === v.ruleId && b.employeeId === v.employeeId && b.date === v.date))
  }, [phase, proposedShifts, selectedIndices, existingShifts])

  async function generate() {
    setPhase('generating')
    setError(null)
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_monday: weekMonday, context: instructions }),
      })
      const data = await res.json() as { shifts?: ProposedShift[]; summary?: string; error?: string }
      if (!res.ok || data.error) {
        setError(data.error ?? 'Erreur lors de la génération')
        setPhase('idle')
        return
      }
      const shifted = data.shifts ?? []
      setProposedShifts(shifted)
      setSelectedIndices(new Set(shifted.map((_, i) => i)))
      setSummary(data.summary ?? '')
      setPhase('preview')
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
      setPhase('idle')
    }
  }

  function toggleShift(i: number) {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function toggleAll() {
    if (selectedIndices.size === proposedShifts.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(proposedShifts.map((_, i) => i)))
    }
  }

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

  function reset() {
    setProposedShifts([])
    setSummary('')
    setPhase('idle')
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
                Décrivez vos besoins pour la semaine. L&apos;IA génère un planning complet en tenant compte des employés, congés et contraintes légales.
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

          {/* ── Preview ── */}
          {phase === 'preview' && (
            <div className="space-y-4">
              {summary && (
                <div
                  className="rounded-xl p-4 text-[13px] leading-relaxed whitespace-pre-wrap"
                  style={{ backgroundColor: 'var(--accent-light)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
                >
                  {summary}
                </div>
              )}

              {violations.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--danger)' }}>
                    {violations.length} alerte{violations.length > 1 ? 's' : ''} de conformité sur la sélection
                  </p>
                  {violations.map((v, i) => {
                    const rule = RULES[v.ruleId]
                    const isCritical = rule.severity === 'critical'
                    return (
                      <div key={i} className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                        style={{ backgroundColor: isCritical ? '#FEE2E2' : '#FEF3C7', border: `0.5px solid ${isCritical ? '#dc2626' : '#D97706'}` }}>
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: isCritical ? '#dc2626' : '#D97706' }} />
                        <div>
                          <p className="text-[12px] font-medium leading-snug" style={{ color: isCritical ? '#991b1b' : '#92400E' }}>
                            {employeeNameById[v.employeeId] ?? 'Employé'} — {rule.name}
                          </p>
                          <p className="text-[11px] leading-snug mt-0.5" style={{ color: isCritical ? '#b91c1c' : '#a16207' }}>
                            {v.description} — <span className="font-medium">{rule.legalRef}</span>
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
                  {proposedShifts.length} shift{proposedShifts.length > 1 ? 's' : ''} proposé{proposedShifts.length > 1 ? 's' : ''}
                </p>
                <button
                  onClick={toggleAll}
                  className="text-[11px]"
                  style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {selectedIndices.size === proposedShifts.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              <div className="space-y-1.5">
                {proposedShifts.map((shift, i) => {
                  const checked = selectedIndices.has(i)
                  return (
                    <div
                      key={i}
                      onClick={() => toggleShift(i)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                      style={{
                        border: `0.5px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                        backgroundColor: checked ? 'var(--accent-light)' : 'var(--bg-page)',
                      }}
                    >
                      <div
                        className="h-4 w-4 rounded flex-shrink-0 flex items-center justify-center"
                        style={{
                          border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                          backgroundColor: checked ? 'var(--accent)' : 'transparent',
                        }}
                      >
                        {checked && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold uppercase"
                        style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                      >
                        {getDayLabel(shift.date).slice(0, 3)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                          {shift.employee_name}
                        </p>
                        <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                          {getDayLabel(shift.date)} · {fmtTime(shift.start_time)}–{fmtTime(shift.end_time)}
                          {shift.position && (
                            <span className="ml-2" style={{ color: 'var(--text-tertiary)' }}>{shift.position}</span>
                          )}
                        </p>
                      </div>
                      {shift.break_minutes > 0 && (
                        <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                          pause {shift.break_minutes}min
                        </span>
                      )}
                    </div>
                  )
                })}
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
                  Création des shifts…
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

          {/* ── Done ── */}
          {phase === 'done' && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                <CheckCircle className="h-5 w-5" style={{ color: 'var(--success)' }} />
              </div>
              <div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  Planning créé !
                </p>
                <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {applied} shift{applied > 1 ? 's' : ''} ajouté{applied > 1 ? 's' : ''} en mode brouillon.
                </p>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Vérifiez et publiez quand vous êtes prêt.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 flex items-center gap-3 flex-shrink-0"
          style={{ borderTop: '0.5px solid var(--border)', justifyContent: phase === 'idle' || phase === 'preview' ? 'space-between' : 'center' }}
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

          {phase === 'preview' && (
            <>
              <button onClick={reset} className="btn-secondary flex items-center gap-2 text-[13px]">
                <RefreshCw className="h-3.5 w-3.5" />
                Recommencer
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => applyShifts(proposedShifts.filter((_, i) => selectedIndices.has(i)))}
                  disabled={selectedIndices.size === 0}
                  className="btn-secondary flex items-center gap-2 text-[13px] disabled:opacity-50"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Importer sélection ({selectedIndices.size})
                </button>
                <button
                  onClick={() => applyShifts(proposedShifts)}
                  disabled={proposedShifts.length === 0}
                  className="btn-primary flex items-center gap-2 text-[13px]"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Importer tous ({proposedShifts.length})
                </button>
              </div>
            </>
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
