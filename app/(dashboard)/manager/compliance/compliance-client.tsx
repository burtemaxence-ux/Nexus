'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AlertTriangle, Info, CheckCircle2, RefreshCw, Calendar,
  ChevronDown, ChevronUp, User, Scale, BookOpen, Wrench,
  XCircle, ShieldCheck, ShieldAlert, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompliancePayload, ComplianceViolation } from '@/app/api/compliance/route'
import type { RuleId, Severity } from '@/lib/compliance/rules'

// ── Period presets ────────────────────────────────────────────────────────────

function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - dow + 1)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

type PeriodPreset = { key: string; label: string; from: string; to: string }

function buildPresets(): PeriodPreset[] {
  const todayStr = today()
  const thisMonday = getWeekMonday(todayStr)
  const nextMonday = addDays(thisMonday, 7)
  const monthFirst = todayStr.slice(0, 7) + '-01'
  const monthLast  = new Date(
    new Date(monthFirst + 'T00:00:00').getFullYear(),
    new Date(monthFirst + 'T00:00:00').getMonth() + 1,
    0
  ).toISOString().split('T')[0]

  return [
    { key: 'this_week',  label: 'Cette semaine',   from: thisMonday,          to: addDays(thisMonday, 6) },
    { key: 'next_week',  label: 'Semaine suivante', from: nextMonday,          to: addDays(nextMonday, 6) },
    { key: '2_weeks',    label: '2 semaines',       from: todayStr,            to: addDays(todayStr, 13) },
    { key: 'this_month', label: 'Ce mois',          from: monthFirst,          to: monthLast },
    { key: '4_weeks',    label: '4 semaines',       from: todayStr,            to: addDays(todayStr, 27) },
  ]
}

// ── Severity config ───────────────────────────────────────────────────────────

const SEV: Record<Severity, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  critical: {
    icon:   XCircle,
    color:  '#DC2626',
    bg:     '#FEF2F2',
    border: '#FECACA',
    label:  'Critique',
  },
  warning: {
    icon:   AlertTriangle,
    color:  '#D97706',
    bg:     '#FFFBEB',
    border: '#FDE68A',
    label:  'Avertissement',
  },
  info: {
    icon:   Info,
    color:  '#2563EB',
    bg:     '#EFF6FF',
    border: '#BFDBFE',
    label:  'Information',
  },
}

// ── Rule label map ────────────────────────────────────────────────────────────

const RULE_LABELS: Record<RuleId, string> = {
  rest_daily:          'Repos quotidien',
  hours_daily_max:     'Durée quotidienne',
  hours_weekly_max:    'Durée hebdomadaire',
  break_missing:       'Pause',
  days_consecutive:    'Jours consécutifs',
  sunday_work:         'Travail dimanche',
  night_work:          'Travail de nuit',
  amplitude_max:       'Amplitude journalière',
  weekly_rest_missing: 'Repos hebdomadaire',
  hours_avg_weekly:    'Moyenne 44h/12 sem.',
  contract_hours_exceeded: 'Dépassement contrat',
  part_time_split:     'Coupure temps partiel',
  minor_hours_daily:   'Mineur — 8h/jour',
  minor_hours_weekly:  'Mineur — 35h/sem.',
  minor_night_work:    'Mineur — travail de nuit',
  minor_rest_daily:    'Mineur — repos quotidien',
  minor_break:         'Mineur — pause',
}

// ── Score gauge ───────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 90 ? '#16A34A' : score >= 70 ? '#D97706' : '#DC2626'
  const Icon = score >= 90 ? ShieldCheck : score >= 70 ? Shield : ShieldAlert

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 flex flex-col items-center justify-center gap-2 min-w-[160px]">
      <Icon className="h-8 w-8" style={{ color }} />
      <div className="text-center">
        <p className="text-[42px] font-bold leading-none tracking-[-0.03em]" style={{ color }}>
          {score}
        </p>
        <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em] mt-0.5">
          Score conformité
        </p>
      </div>
      {/* Bar */}
      <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden mt-1">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <p className="text-[11px] text-[var(--text-secondary)] text-center">
        {score === 100 ? 'Aucune anomalie' : score >= 90 ? 'Conforme' : score >= 70 ? 'Points d\'attention' : 'Non conforme'}
      </p>
    </div>
  )
}

// ── Severity summary card ─────────────────────────────────────────────────────

function SevCard({ severity, count, active, onClick }: {
  severity: Severity; count: number; active: boolean; onClick: () => void
}) {
  const s = SEV[severity]
  const Icon = s.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-150 text-left',
        active
          ? 'border-current shadow-sm'
          : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-current'
      )}
      style={active ? { background: s.bg, borderColor: s.border, color: s.color } : { color: s.color }}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <div>
        <p className="text-[22px] font-bold leading-none">{count}</p>
        <p className="text-[11px] font-medium opacity-80 mt-0.5">{s.label}</p>
      </div>
    </button>
  )
}

// ── Violation card ────────────────────────────────────────────────────────────

function ViolationCard({ v }: { v: ComplianceViolation }) {
  const [open, setOpen] = useState(false)
  const s = SEV[v.severity]
  const SevIcon = s.icon

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div
      className="border rounded-xl overflow-hidden"
      style={{ borderColor: s.border }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 px-4 py-3" style={{ background: s.bg }}>
        <SevIcon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: s.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold" style={{ color: s.color }}>{v.ruleName}</span>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ color: s.color, background: `${s.color}20` }}
            >
              {s.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-[12px] text-[var(--text-secondary)]">
              <User className="h-3 w-3" />{v.employeeName}
            </span>
            <span className="flex items-center gap-1 text-[12px] text-[var(--text-secondary)]">
              <Calendar className="h-3 w-3" />{fmtDate(v.date)}
            </span>
          </div>
          <p className="text-[12px] text-[var(--text-primary)] mt-1.5">{v.description}</p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors"
          style={{ color: s.color }}
          title={open ? 'Réduire' : 'Détails'}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Expanded details */}
      {open && (
        <div className="px-4 py-3 bg-[var(--bg-card)] space-y-2.5">
          <div className="flex items-start gap-2">
            <BookOpen className="h-3.5 w-3.5 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.05em]">Référence légale</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{v.legalRef}</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{v.ruleDescription}</p>
            </div>
          </div>
          {v.suggestedFix && (
            <div className="flex items-start gap-2">
              <Wrench className="h-3.5 w-3.5 text-[var(--accent)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-[0.05em]">Correction suggérée</p>
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{v.suggestedFix}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Rule summary bar ──────────────────────────────────────────────────────────

function RuleSummary({ byRule }: { byRule: Partial<Record<RuleId, number>> }) {
  const entries = Object.entries(byRule) as [RuleId, number][]
  if (entries.length === 0) return null
  entries.sort((a, b) => b[1] - a[1])
  const max = entries[0][1]

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--border)]">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Répartition par règle</h3>
      </div>
      <div className="p-5 space-y-3">
        {entries.map(([ruleId, count]) => (
          <div key={ruleId} className="flex items-center gap-3">
            <p className="text-[13px] text-[var(--text-secondary)] w-44 flex-shrink-0 truncate">
              {RULE_LABELS[ruleId]}
            </p>
            <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${Math.round(count / max * 100)}%` }}
              />
            </div>
            <span className="text-[13px] font-semibold text-[var(--text-primary)] w-5 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-6 py-12 flex flex-col items-center gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-[#DCFCE7] flex items-center justify-center">
        <CheckCircle2 className="h-7 w-7 text-[#16A34A]" />
      </div>
      <p className="text-[15px] font-semibold text-[var(--text-primary)]">Planning conforme</p>
      <p className="text-[13px] text-[var(--text-secondary)] max-w-xs">
        Aucune anomalie légale détectée sur la période sélectionnée.
      </p>
    </div>
  )
}

// ── Legal reference panel ─────────────────────────────────────────────────────

const LEGAL_REFS = [
  { rule: 'Repos quotidien (11h min)',         ref: 'L3131-1', severity: 'critical' as Severity },
  { rule: 'Durée max quotidienne (10h)',        ref: 'L3121-18', severity: 'critical' as Severity },
  { rule: 'Durée max hebdomadaire (48h)',       ref: 'L3121-20', severity: 'critical' as Severity },
  { rule: 'Pause obligatoire (20 min / 6h)',   ref: 'L3121-16', severity: 'warning' as Severity },
  { rule: 'Repos hebdomadaire (35h consécutives)', ref: 'L3132-1', severity: 'critical' as Severity },
  { rule: 'Travail du dimanche',               ref: 'L3132-3', severity: 'info' as Severity },
  { rule: 'Travail de nuit (21h–6h)',          ref: 'L3122-2', severity: 'warning' as Severity },
]

function LegalPanel() {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-[var(--bg-page)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">
            Règles vérifiées — Code du travail
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />}
      </button>
      {open && (
        <div className="border-t border-[var(--border)]">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-page)]">
                <th className="text-left px-5 py-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em]">Règle</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em]">Article</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em]">Sévérité</th>
              </tr>
            </thead>
            <tbody>
              {LEGAL_REFS.map((r, i) => {
                const s = SEV[r.severity]
                return (
                  <tr key={i} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-5 py-2.5 text-[var(--text-primary)]">{r.rule}</td>
                    <td className="px-3 py-2.5 font-mono text-[var(--text-secondary)]">Art. {r.ref} CT</td>
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ color: s.color, background: s.bg }}
                      >
                        {s.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type GroupBy = 'none' | 'employee' | 'rule'

export default function ComplianceClient() {
  const presets = buildPresets()
  const [preset, setPreset]   = useState(presets[0].key)
  const [data, setData]       = useState<CompliancePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [sevFilter, setSevFilter] = useState<Severity | null>(null)
  const [groupBy, setGroupBy]     = useState<GroupBy>('none')

  const activePeriod = presets.find(p => p.key === preset) ?? presets[0]

  const fetchData = useCallback(async (from: string, to: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/compliance?from=${from}&to=${to}`)
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      setError('Impossible de charger les données de conformité.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(activePeriod.from, activePeriod.to)
  }, [activePeriod.from, activePeriod.to, fetchData])

  // Filter violations
  const filtered = (data?.violations ?? []).filter(v =>
    sevFilter === null || v.severity === sevFilter
  )

  // Group violations
  function groupViolations(list: ComplianceViolation[]) {
    if (groupBy === 'none') return { '': list }
    if (groupBy === 'employee') {
      const groups: Record<string, ComplianceViolation[]> = {}
      for (const v of list) {
        if (!groups[v.employeeName]) groups[v.employeeName] = []
        groups[v.employeeName].push(v)
      }
      return groups
    }
    // by rule
    const groups: Record<string, ComplianceViolation[]> = {}
    for (const v of list) {
      if (!groups[v.ruleName]) groups[v.ruleName] = []
      groups[v.ruleName].push(v)
    }
    return groups
  }

  const grouped = groupViolations(filtered)

  return (
    <div className="space-y-5">

      {/* ── Period selector ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
          {presets.map(p => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150',
                preset === p.key
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-page)]'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {data && (
          <p className="text-[12px] text-[var(--text-tertiary)]">
            {new Date(data.from + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            {' – '}
            {new Date(data.to + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' · '}
            {data.totalShifts} shift{data.totalShifts !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[13px]">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => fetchData(activePeriod.from, activePeriod.to)}
            className="ml-auto flex items-center gap-1 underline underline-offset-2 text-[12px]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Réessayer
          </button>
        </div>
      )}

      {/* ── Loading skeleton ───────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="animate-pulse rounded-xl bg-[var(--border)] h-[156px] w-[160px]" />
            <div className="flex-1 flex gap-3">
              {[0,1,2].map(i => <div key={i} className="flex-1 animate-pulse rounded-xl bg-[var(--border)] h-[156px]" />)}
            </div>
          </div>
          <div className="animate-pulse rounded-xl bg-[var(--border)] h-[200px]" />
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {!loading && data && (
        <>
          {/* Top row: score + severity summary */}
          <div className="flex gap-4 items-stretch flex-wrap">
            <ScoreGauge score={data.complianceScore} />
            <div className="flex gap-3 flex-1 flex-wrap">
              {(['critical', 'warning', 'info'] as Severity[]).map(sev => (
                <SevCard
                  key={sev}
                  severity={sev}
                  count={data.bySeverity[sev]}
                  active={sevFilter === sev}
                  onClick={() => setSevFilter(f => f === sev ? null : sev)}
                />
              ))}
            </div>
          </div>

          {/* Stats strip */}
          {data.violations.length > 0 && (
            <div className="flex items-center gap-4 px-5 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[13px] text-[var(--text-secondary)] flex-wrap">
              <span>{data.violations.length} anomalie{data.violations.length !== 1 ? 's' : ''} détectée{data.violations.length !== 1 ? 's' : ''}</span>
              <span className="text-[var(--border)]">·</span>
              <span>{data.employeesAffected} employé{data.employeesAffected !== 1 ? 's' : ''} concerné{data.employeesAffected !== 1 ? 's' : ''}</span>
              {sevFilter && (
                <>
                  <span className="text-[var(--border)]">·</span>
                  <button
                    onClick={() => setSevFilter(null)}
                    className="flex items-center gap-1 text-[var(--accent)] text-[12px]"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Effacer le filtre
                  </button>
                </>
              )}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-tertiary)]">Grouper par</span>
                {(['none', 'employee', 'rule'] as GroupBy[]).map(g => (
                  <button
                    key={g}
                    onClick={() => setGroupBy(g)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[12px] transition-colors duration-150',
                      groupBy === g
                        ? 'bg-[var(--accent-light)] text-[var(--accent)] font-medium'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    {g === 'none' ? 'Aucun' : g === 'employee' ? 'Employé' : 'Règle'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Violations list / empty state */}
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  {group && (
                    <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.08em] mb-2.5">
                      {group}
                    </p>
                  )}
                  <div className="space-y-2">
                    {items.map((v, i) => (
                      <ViolationCard key={`${v.ruleId}-${v.employeeId}-${v.date}-${i}`} v={v} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rule breakdown (only if violations exist) */}
          {data.violations.length > 0 && (
            <RuleSummary byRule={data.byRule} />
          )}

          {/* Legal reference panel */}
          <LegalPanel />
        </>
      )}
    </div>
  )
}
