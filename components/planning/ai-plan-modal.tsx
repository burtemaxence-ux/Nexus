'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Loader2, CheckCircle, ChevronRight, Wand2, TrendingUp, Cpu, Info } from 'lucide-react'
import { type Profile, type Poste, type Shift } from '@/types'
import { type ProposedShift } from '@/app/api/ai/plan/route'

type ModalPhase = 'idle' | 'running' | 'done'
type Engine = 'ai' | 'algorithm'

const SUGGESTIONS = [
  '3 serveurs chaque soir 18h–23h, fermé dimanche',
  'Planning léger en semaine, renforcé week-end',
  'Couvrir ouverture et fermeture chaque jour',
  'Répartir équitablement entre tous les employés',
]

const DOW_LABELS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

// Statuts HTTP qui affectent TOUS les jours identiquement (quota épuisé, clé
// API manquante, rate-limit) : inutile de continuer à taper les 6 autres
// jours pour se faire rejeter 6 fois de la même façon.
const HARD_STOP_STATUSES = new Set([402, 429, 503])

function weekDaysFrom(weekMonday: string): string[] {
  const start = new Date(weekMonday + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

type ResponseData = {
  shifts?: ProposedShift[]; summary?: string; error?: string; partial?: boolean; day_skipped?: boolean
  targetPct?: number; estimatedRatioPct?: number | null; estimatedCost?: number
  forecastTotal?: number; historicalRatioPct?: number | null
}

type DayResult =
  | { kind: 'ok'; data: ResponseData }
  | { kind: 'hard-stop'; message: string }
  | { kind: 'soft-fail' }

// Progression : `step` distingue la phase (génération vs enregistrement) ;
// `current/total` = jours (7 en IA, 1 en algorithme) ; `subCurrent/subTotal` =
// créneaux enregistrés dans la phase d'enregistrement en cours.
type Progress = { current: number; total: number; label: string; step: 'gen' | 'save'; subCurrent: number; subTotal: number }

type ResultState = { targetPct: number; estimatedRatioPct: number | null; estimatedCost: number; forecastTotal: number; historicalRatioPct: number | null }

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
  const [engine, setEngine] = useState<Engine>('algorithm') // défaut = algorithme (instantané, conforme)
  const [showEngineInfo, setShowEngineInfo] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(0)
  const [progress, setProgress] = useState<Progress | null>(null)

  // Copilote de productivité : prévision de CA + cible coût/CA.
  const [forecastTotal, setForecastTotal] = useState(0)
  const [historicalRatioPct, setHistoricalRatioPct] = useState<number | null>(null)
  const [targetBasis, setTargetBasis] = useState<'history' | 'sector'>('sector')
  const [targetPct, setTargetPct] = useState('')
  const [result, setResult] = useState<ResultState | null>(null)

  // Pré-remplit le moteur actif + la cible suggérée et le CA prévu à
  // l'ouverture (sans appel IA). Le moteur détermine le flux de génération.
  useEffect(() => {
    fetch(`/api/ai/plan?week_monday=${weekMonday}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return
        if (d.engine === 'ai' || d.engine === 'algorithm') setEngine(d.engine)
        setForecastTotal(d.forecastTotal ?? 0)
        setHistoricalRatioPct(d.historicalRatioPct ?? null)
        setTargetBasis(d.targetBasis ?? 'sector')
        setTargetPct(String(d.suggestedTargetPct ?? 30))
      })
      .catch(() => {})
  }, [weekMonday])

  // Change le moteur : met à jour l'état local (pilote le flux + le texte) ET
  // persiste le réglage (best-effort) pour la prochaine fois. La génération
  // transmet de toute façon le moteur choisi en override, donc pas de course.
  function selectEngine(next: Engine) {
    if (next === engine) return
    setEngine(next)
    fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planning_engine: next }),
    }).catch(() => {})
  }

  function captureResult(data: ResponseData) {
    if ((data.forecastTotal ?? 0) > 0) {
      setResult({
        targetPct: data.targetPct ?? Number(targetPct || 0),
        estimatedRatioPct: data.estimatedRatioPct ?? null,
        estimatedCost: data.estimatedCost ?? 0,
        forecastTotal: data.forecastTotal ?? 0,
        historicalRatioPct: data.historicalRatioPct ?? null,
      })
    }
  }

  // Enregistre une liste de créneaux en brouillon en UN SEUL appel groupé
  // (/api/shifts/bulk) : une seule requête + une seule synchro de conformité
  // par employé/semaine côté serveur (au lieu de N requêtes). La conformité a
  // déjà été garantie côté serveur (algorithme conforme par construction, ou
  // IA vérifiée en temps réel + repairPlan). `skipped` = créneaux écartés côté
  // serveur (chevauchement/doublon).
  async function applyShiftList(toApply: ProposedShift[]): Promise<{ count: number; skipped: number; firstError: string | null }> {
    setProgress(p => (p ? { ...p, step: 'save', subCurrent: 0, subTotal: toApply.length } : p))
    try {
      const res = await fetch('/api/shifts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shifts: toApply.map(s => ({
            employee_id: s.employee_id,
            date: s.date,
            start_time: s.start_time,
            end_time: s.end_time,
            break_minutes: s.break_minutes,
            poste_id: s.poste_id,
            position: s.position,
            notes: s.notes,
          })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { count: 0, skipped: 0, firstError: data.error ?? `HTTP ${res.status}` }
      const count = data.created ?? 0
      setApplied(a => a + count)
      setProgress(p => (p ? { ...p, subCurrent: count } : p))
      return { count, skipped: data.skipped ?? 0, firstError: null }
    } catch {
      return { count: 0, skipped: 0, firstError: 'réseau' }
    }
  }

  // ── Moteur ALGORITHME : un seul appel, semaine entière, instantané ────────
  async function generateAlgorithm() {
    setProgress({ current: 0, total: 1, label: 'la semaine', step: 'gen', subCurrent: 0, subTotal: 0 })
    let res: Response
    try {
      res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_monday: weekMonday, engine: 'algorithm', target_ratio: targetPct ? Number(targetPct) : undefined }),
      })
    } catch { setError('Erreur réseau. Veuillez réessayer.'); setPhase('idle'); return }

    const text = await res.text()
    let data: ResponseData = {}
    try { data = text ? JSON.parse(text) : {} } catch {
      setError(`Réponse serveur invalide (HTTP ${res.status}).`); setPhase('idle'); return
    }
    if (!res.ok || data.error) { setError(data.error ?? 'Erreur lors de la génération'); setPhase('idle'); return }

    captureResult(data)
    const shifts = data.shifts ?? []
    if (shifts.length === 0) {
      setApplied(0)
      setSummary(data.summary || "Aucun créneau généré : vérifiez les heures d'ouverture, les jours fermés et les contrats (Réglages › Règles).")
      setPhase('done')
      return
    }

    setProgress({ current: 1, total: 1, label: 'la semaine', step: 'save', subCurrent: 0, subTotal: shifts.length })
    const { count, skipped } = await applyShiftList(shifts)
    const days = new Set(shifts.map(s => s.date)).size
    const skipNote = skipped > 0 ? ` ${skipped} ignoré${skipped > 1 ? 's' : ''} (créneau déjà présent).` : ''
    setSummary(`${count} créneau${count > 1 ? 'x' : ''} créé${count > 1 ? 's' : ''} en brouillon sur ${days} jour${days > 1 ? 's' : ''}.${skipNote} Planning conforme au Code du travail (repos 11h, max 10h/jour, heures contractuelles respectées).`)
    setPhase('done')
    if (count > 0) onSuccess()
  }

  // ── Moteur IA : jour par jour (option) ────────────────────────────────────
  // Génère UN jour. Body en texte d'abord : si JSON.parse échoue (504 Vercel
  // renvoie du HTML/vide), on retombe sur le statut HTTP. Les statuts
  // HARD_STOP affectent tous les jours identiquement → remontés à part pour
  // arrêter la boucle au lieu d'enchaîner 7 échecs identiques.
  async function requestDay(targetDate: string, isLastDay: boolean): Promise<DayResult> {
    let res: Response
    try {
      res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_monday: weekMonday,
          engine: 'ai',
          target_date: targetDate,
          is_last_day: isLastDay,
          context: instructions,
          target_ratio: targetPct ? Number(targetPct) : undefined,
        }),
      })
    } catch {
      return { kind: 'soft-fail' }
    }

    const text = await res.text()
    let data: ResponseData = {}
    try { data = text ? JSON.parse(text) : {} } catch {
      return HARD_STOP_STATUSES.has(res.status)
        ? { kind: 'hard-stop', message: "La génération IA a dépassé le délai. Réessayez ou utilisez l'algorithme déterministe (Réglages › Règles)." }
        : { kind: 'soft-fail' }
    }

    if (!res.ok || data.error) {
      return HARD_STOP_STATUSES.has(res.status)
        ? { kind: 'hard-stop', message: data.error ?? 'Erreur lors de la génération' }
        : { kind: 'soft-fail' }
    }

    return { kind: 'ok', data }
  }

  async function generateAi() {
    const days = weekDaysFrom(weekMonday)
    let totalApplied = 0
    const coveredDays = new Set<string>()
    const issueDays: string[] = []

    // Chaque jour est généré PUIS enregistré avant de passer au suivant : le
    // contexte de conformité du jour suivant (repos, jours consécutifs) vient
    // directement de la base, où les jours précédents sont déjà écrits.
    for (let i = 0; i < days.length; i++) {
      const day = days[i]
      const label = DOW_LABELS[i]
      setProgress({ current: i + 1, total: days.length, label, step: 'gen', subCurrent: 0, subTotal: 0 })

      const outcome = await requestDay(day, i === days.length - 1)

      if (outcome.kind === 'hard-stop') {
        if (totalApplied > 0) { issueDays.push(`${label} et suivants`); break }
        setError(outcome.message); setPhase('idle'); return
      }
      if (outcome.kind === 'soft-fail') { issueDays.push(label); continue }

      const { data } = outcome
      if (data.day_skipped) continue
      if (data.partial) issueDays.push(`${label} (incomplet)`)
      captureResult(data)

      const dayShifts = data.shifts ?? []
      if (dayShifts.length > 0) {
        setProgress({ current: i + 1, total: days.length, label, step: 'save', subCurrent: 0, subTotal: dayShifts.length })
        const { count } = await applyShiftList(dayShifts)
        totalApplied += count
        if (count > 0) coveredDays.add(day)
        if (count < dayShifts.length && !issueDays.includes(label)) issueDays.push(label)
      }
    }

    const issueNote = issueDays.length > 0
      ? ` À compléter/relancer sur : ${issueDays.join(', ')}.`
      : ''
    setSummary(totalApplied > 0
      ? `${totalApplied} créneau${totalApplied > 1 ? 'x' : ''} créé${totalApplied > 1 ? 's' : ''} en brouillon sur ${coveredDays.size} jour${coveredDays.size > 1 ? 's' : ''}.${issueNote}`
      : `Aucun créneau généré.${issueNote}`)
    setPhase('done')
    if (totalApplied > 0) onSuccess()
  }

  // Un seul clic manager. Le flux dépend du moteur actif (algorithme = 1 appel
  // instantané ; IA = jour par jour pour tenir sous la limite de temps).
  async function generate() {
    setError(null)
    setPhase('running')
    setApplied(0)
    setSummary('')
    setResult(null)
    if (engine === 'algorithm') await generateAlgorithm()
    else await generateAi()
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
              Auto-planning
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
              {/* Sélecteur de méthode : algorithme (défaut) ↔ IA, avec explication dépliable */}
              <div className="rounded-xl p-3" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
                    Méthode de génération
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEngineInfo(v => !v)}
                    className="flex items-center gap-1 text-[11px] transition-colors"
                    style={{ color: showEngineInfo ? 'var(--accent)' : 'var(--text-tertiary)' }}
                    aria-expanded={showEngineInfo}
                  >
                    <Info className="h-3.5 w-3.5" />
                    Différence
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {([
                    { value: 'algorithm' as Engine, icon: Cpu, label: 'Algorithme' },
                    { value: 'ai' as Engine, icon: Sparkles, label: 'Assistant IA' },
                  ]).map(opt => {
                    const active = engine === opt.value
                    const Icon = opt.icon
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => selectEngine(opt.value)}
                        className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors"
                        style={{
                          border: active ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
                          backgroundColor: active ? 'var(--accent-light)' : 'var(--bg-card)',
                          color: active ? 'var(--accent)' : 'var(--text-secondary)',
                        }}
                        aria-pressed={active}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </button>
                    )
                  })}
                </div>

                {showEngineInfo && (
                  <div className="mt-2.5 space-y-2 text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <p className="flex items-start gap-1.5">
                      <Cpu className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                      <span><strong style={{ color: 'var(--text-primary)' }}>Algorithme</strong> — instantané et gratuit, respecte le Code du travail par construction (repos, pauses, contrats) et couvre tous les jours ouverts. Ne lit pas les consignes en texte libre.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                      <span><strong style={{ color: 'var(--text-primary)' }}>Assistant IA</strong> — comprend vos demandes en texte libre (« 3 serveurs le week-end… »), plus souple, mais plus lent et peut nécessiter des ajustements.</span>
                    </p>
                  </div>
                )}
              </div>

              {engine === 'algorithm' ? (
                <div className="flex items-start gap-2.5 rounded-xl p-3.5" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                  <Cpu className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                  <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    Génération automatique d&apos;un planning <strong style={{ color: 'var(--text-primary)' }}>conforme et équilibré</strong> pour toute la semaine, en respectant repos, pauses et heures contractuelles. Instantané. Vous ajustez ensuite sur le planning.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    Décrivez vos besoins pour la semaine. L&apos;IA génère et applique un planning complet en brouillon — vous le vérifiez et l&apos;ajustez ensuite.
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
                </>
              )}

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

          {/* ── Running (génération + application) ── */}
          {phase === 'running' && (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
                  {progress?.step === 'save'
                    ? <Wand2 className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                    : <Sparkles className="h-5 w-5" style={{ color: 'var(--accent)' }} />}
                </div>
                <div className="absolute -bottom-1 -right-1">
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent)' }} />
                </div>
              </div>
              <div>
                <p className="text-[14px] font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                  {progress?.step === 'save'
                    ? 'Enregistrement du planning…'
                    : engine === 'ai' && progress
                      ? `Génération : ${progress.label} (${progress.current}/${progress.total})…`
                      : 'Génération en cours…'}
                </p>
                <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {progress?.step === 'save'
                    ? `${progress.subCurrent} / ${progress.subTotal} créneaux enregistrés`
                    : engine === 'algorithm'
                      ? 'Calcul instantané, conforme au Code du travail'
                      : "L'IA construit ce jour en respectant le Code du travail"}
                </p>
                {(engine === 'ai' || progress?.step === 'save') && (
                  <div className="mt-3 h-1.5 w-48 rounded-full overflow-hidden mx-auto" style={{ backgroundColor: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: progress
                          ? `${progress.step === 'save' && progress.subTotal > 0
                              ? (progress.subCurrent / progress.subTotal) * 100
                              : (progress.current / progress.total) * 100}%`
                          : '0%',
                        backgroundColor: 'var(--accent)',
                      }}
                    />
                  </div>
                )}
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
                {summary && (
                  <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {summary}
                  </p>
                )}
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
                <p className="text-[12px] mt-3" style={{ color: 'var(--text-tertiary)' }}>
                  {engine === 'algorithm'
                    ? 'Ajustez les créneaux si besoin, puis publiez.'
                    : 'Utilisez « Vérifier » sur le planning pour repérer les éventuelles infractions (cases en rouge), puis publiez.'}
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

          {phase === 'running' && (
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
