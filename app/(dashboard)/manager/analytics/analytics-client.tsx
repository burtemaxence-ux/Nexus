'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, LineChart, Line, ReferenceLine, PieChart, Pie, Cell,
} from 'recharts'
import {
  Euro, Clock, TrendingUp, CalendarOff, UserMinus, AlertTriangle,
  RefreshCw, TrendingDown, Activity, Users, ChevronDown, ChevronUp,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnalyticsPayload, EmployeeAnalytics } from '@/app/api/analytics/route'

// ── Palette (no CSS vars in recharts) ────────────────────────────────────────

const C = {
  primary:   '#2D3A8C',
  primaryLt: '#EEF0FA',
  success:   '#16A34A',
  successLt: '#DCFCE7',
  warning:   '#D97706',
  warningLt: '#FEF3C7',
  danger:    '#DC2626',
  dangerLt:  '#FEE2E2',
  border:    '#EBEBEB',
  text:      '#111111',
  textSec:   '#6B7280',
  textTer:   '#BBBBBB',
  bg:        '#FAFAFA',
  card:      '#FFFFFF',
  planned:   '#93C5FD',
  real:      '#2D3A8C',
  absence: {
    maladie: '#F87171',
    cp:      '#60A5FA',
    rtt:     '#818CF8',
    autres:  '#FBBF24',
  },
} as const

// ── Period options ────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { key: '4w',  label: '4 semaines' },
  { key: '3m',  label: '3 mois' },
  { key: '6m',  label: '6 mois' },
  { key: '12m', label: '12 mois' },
] as const

type PeriodKey = '4w' | '3m' | '6m' | '12m'

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function fmtH(n: number) {
  return `${n.toLocaleString('fr-FR')} h`
}

function fmtPct(n: number) {
  return `${n} %`
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  trend?: 'up-good' | 'up-bad' | 'down-good' | 'down-bad' | null
  accentColor?: string
  accentLight?: string
}

function KpiCard({ icon: Icon, label, value, sub, accentColor = C.primary, accentLight = C.primaryLt }: KpiCardProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: accentLight }}>
        <Icon className="h-4 w-4" style={{ color: accentColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-[0.06em] font-medium leading-none mb-1">{label}</p>
        <p className="text-[22px] font-semibold text-[var(--text-primary)] leading-none tracking-[-0.02em]">{value}</p>
        {sub && <p className="text-[11px] text-[var(--text-secondary)] mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Flag badge ────────────────────────────────────────────────────────────────

const FLAG_META: Record<EmployeeAnalytics['flags'][number], { label: string; color: string; light: string }> = {
  sick_frequent: { label: 'Maladie fréq.',  color: C.danger,  light: C.dangerLt },
  late_chronic:  { label: 'Retards chron.', color: C.warning, light: C.warningLt },
  absence_high:  { label: 'Abs. élevée',    color: '#7C3AED', light: '#EDE9FE' },
}

function FlagBadge({ flag }: { flag: keyof typeof FLAG_META }) {
  const m = FLAG_META[flag]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold leading-none"
      style={{ color: m.color, background: m.light }}
    >
      {m.label}
    </span>
  )
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, formatter }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string
  formatter?: (v: number, name: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#EBEBEB] rounded-xl px-3 py-2.5 shadow-sm text-[12px]">
      {label && <p className="text-[#6B7280] font-medium mb-1.5">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 leading-snug">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-[#6B7280]">{p.name}:</span>
          <span className="font-semibold text-[#111111] ml-auto pl-3">
            {formatter ? formatter(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-[var(--border)]', className)} />
  )
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[84px]" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[280px]" />
        <Skeleton className="h-[280px]" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[280px]" />
        <Skeleton className="h-[280px]" />
      </div>
    </div>
  )
}

// ── CA Target modal ───────────────────────────────────────────────────────────

function CaTargetInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  return (
    <div className="flex items-center gap-2">
      <Target className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
      {editing ? (
        <form
          onSubmit={e => {
            e.preventDefault()
            onChange(draft)
            setEditing(false)
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="number"
            min={0}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="w-24 h-6 text-[11px] border border-[var(--border)] rounded-md px-2 focus:outline-none focus:border-[var(--accent)]"
            placeholder="CA objectif €"
            autoFocus
          />
          <button type="submit" className="text-[11px] text-[var(--accent)] font-medium">OK</button>
          <button type="button" onClick={() => setEditing(false)} className="text-[11px] text-[var(--text-tertiary)]">✕</button>
        </form>
      ) : (
        <button
          onClick={() => { setDraft(value); setEditing(true) }}
          className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {value ? `Objectif CA : ${fmtEur(Number(value))}` : 'Définir objectif CA'}
        </button>
      )}
    </div>
  )
}

// ── Turnover section ──────────────────────────────────────────────────────────

function TurnoverSection({ data }: { data: AnalyticsPayload['turnover'] }) {
  if (data.length === 0) {
    return (
      <p className="text-[13px] text-[var(--text-tertiary)] text-center py-6">
        Aucun départ sur la période
      </p>
    )
  }

  const byMonth: Record<string, typeof data> = {}
  for (const e of data) {
    if (!byMonth[e.monthKey]) byMonth[e.monthKey] = []
    byMonth[e.monthKey].push(e)
  }
  const sortedMonths = Object.keys(byMonth).sort().reverse()

  return (
    <div className="space-y-4">
      {sortedMonths.map(mk => (
        <div key={mk}>
          <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em] mb-2">
            {byMonth[mk][0].monthLabel}
          </p>
          <div className="space-y-1.5">
            {byMonth[mk].map((e, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--bg-page)] border border-[var(--border)]">
                <div className="w-7 h-7 rounded-full bg-[#FEE2E2] flex items-center justify-center flex-shrink-0">
                  <UserMinus className="h-3.5 w-3.5 text-[#DC2626]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{e.name}</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {[e.position, e.contractType].filter(Boolean).join(' · ') || 'Employé'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Chronic absenteeism table ─────────────────────────────────────────────────

function ChronicTable({ employees }: { employees: EmployeeAnalytics[] }) {
  const risky = employees.filter(e => e.flags.length > 0)
  const [showAll, setShowAll] = useState(false)

  if (risky.length === 0) {
    return (
      <p className="text-[13px] text-[var(--text-tertiary)] text-center py-6">
        Aucun employé à risque détecté sur la période
      </p>
    )
  }

  const displayed = showAll ? risky : risky.slice(0, 5)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.05em] pb-2 pr-4">Employé</th>
              <th className="text-right text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.05em] pb-2 px-3">Abs.</th>
              <th className="text-right text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.05em] pb-2 px-3">Retards</th>
              <th className="text-right text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.05em] pb-2 px-3">Taux abs.</th>
              <th className="text-left text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.05em] pb-2 pl-3">Signalements</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((e) => (
              <tr key={e.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-2.5 pr-4">
                  <p className="font-medium text-[var(--text-primary)]">{e.name}</p>
                  {e.position && <p className="text-[11px] text-[var(--text-secondary)]">{e.position}</p>}
                </td>
                <td className="py-2.5 px-3 text-right text-[var(--text-secondary)]">{e.absenceDays}j</td>
                <td className="py-2.5 px-3 text-right text-[var(--text-secondary)]">{e.unjustifiedLateCount}</td>
                <td className="py-2.5 px-3 text-right">
                  <span className={cn(
                    'font-semibold',
                    e.absenceRate >= 20 ? 'text-[#DC2626]' : e.absenceRate >= 10 ? 'text-[#D97706]' : 'text-[var(--text-primary)]'
                  )}>
                    {e.absenceRate} %
                  </span>
                </td>
                <td className="py-2.5 pl-3">
                  <div className="flex flex-wrap gap-1">
                    {e.flags.map(f => <FlagBadge key={f} flag={f} />)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {risky.length > 5 && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="mt-3 flex items-center gap-1 text-[12px] text-[var(--accent)] hover:opacity-80 transition-opacity"
        >
          {showAll ? <><ChevronUp className="h-3.5 w-3.5" /> Réduire</> : <><ChevronDown className="h-3.5 w-3.5" /> Voir {risky.length - 5} de plus</>}
        </button>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AnalyticsClient() {
  const [period, setPeriod] = useState<PeriodKey>('3m')
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [caTarget, setCaTarget] = useState<string>('')

  // Load CA target from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dp-analytics-ca-target')
    if (stored) setCaTarget(stored)
  }, [])

  const handleCaTarget = useCallback((v: string) => {
    setCaTarget(v)
    localStorage.setItem('dp-analytics-ca-target', v)
  }, [])

  const fetchData = useCallback(async (p: PeriodKey) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/analytics?period=${p}`)
      if (!res.ok) throw new Error('Erreur serveur')
      const json = await res.json()
      setData(json)
    } catch {
      setError('Impossible de charger les données analytiques.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(period) }, [period, fetchData])

  const caRatio = data && caTarget && Number(caTarget) > 0
    ? Math.round(data.kpi.totalLaborCost / Number(caTarget) * 100)
    : null

  return (
    <div className="space-y-5">

      {/* ── Period selector ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setPeriod(opt.key)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150',
                period === opt.key
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-page)]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {data && (
          <p className="text-[12px] text-[var(--text-tertiary)]">{data.periodLabel}</p>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#DC2626] text-[13px]">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => fetchData(period)} className="ml-auto flex items-center gap-1 text-[12px] underline underline-offset-2">
            <RefreshCw className="h-3.5 w-3.5" /> Réessayer
          </button>
        </div>
      )}

      {/* ── Loading ────────────────────────────────────────────────────────── */}
      {loading && <LoadingState />}

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {!loading && data && (
        <>

          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiCard
              icon={Euro}
              label="Masse salariale"
              value={fmtEur(data.kpi.totalLaborCost)}
              sub={caRatio !== null ? `${caRatio} % du CA` : undefined}
              accentColor={C.primary}
              accentLight={C.primaryLt}
            />
            <KpiCard
              icon={Clock}
              label="Heures réelles"
              value={fmtH(data.kpi.totalRealHours)}
              sub={`Planifiées : ${fmtH(data.kpi.totalPlannedHours)}`}
              accentColor={C.primary}
              accentLight={C.primaryLt}
            />
            <KpiCard
              icon={TrendingUp}
              label="Taux de présence"
              value={fmtPct(data.kpi.avgPresenceRate)}
              sub={data.kpi.avgPresenceRate < 80 ? 'En dessous de 80 %' : 'Objectif atteint'}
              accentColor={data.kpi.avgPresenceRate >= 80 ? C.success : C.warning}
              accentLight={data.kpi.avgPresenceRate >= 80 ? C.successLt : C.warningLt}
            />
            <KpiCard
              icon={CalendarOff}
              label="Jours d'absence"
              value={String(data.kpi.totalAbsenceDays)}
              sub={`Dont maladie : ${data.kpi.totalSickDays}j`}
              accentColor={C.warning}
              accentLight={C.warningLt}
            />
            <KpiCard
              icon={UserMinus}
              label="Turnover"
              value={String(data.kpi.turnoverCount)}
              sub={data.kpi.turnoverCount === 0 ? 'Aucun départ' : `départ${data.kpi.turnoverCount > 1 ? 's' : ''} sur la période`}
              accentColor={data.kpi.turnoverCount > 0 ? C.danger : C.success}
              accentLight={data.kpi.turnoverCount > 0 ? C.dangerLt : C.successLt}
            />
            <KpiCard
              icon={AlertTriangle}
              label="Employés à risque"
              value={String(data.kpi.chronicCount)}
              sub={`sur ${data.kpi.activeEmployees} actifs`}
              accentColor={data.kpi.chronicCount > 0 ? C.danger : C.success}
              accentLight={data.kpi.chronicCount > 0 ? C.dangerLt : C.successLt}
            />
          </div>

          {/* Charts row 1: Labor cost + Hours */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Masse salariale par période */}
            <Section
              title="Masse salariale"
              action={
                <CaTargetInput value={caTarget} onChange={handleCaTarget} />
              }
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.buckets} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={C.border} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: C.textSec, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: C.textSec, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k€` : `${v}€`}
                  />
                  <Tooltip
                    content={<ChartTooltip formatter={v => fmtEur(v)} />}
                    cursor={{ fill: C.primaryLt }}
                  />
                  <Bar dataKey="laborCost" name="Masse salariale" fill={C.primary} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  {caTarget && Number(caTarget) > 0 && (
                    <ReferenceLine
                      y={Number(caTarget) * 0.33}
                      stroke={C.warning}
                      strokeDasharray="4 3"
                      label={{ value: '33 % CA', fill: C.warning, fontSize: 10, position: 'insideTopRight' }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </Section>

            {/* Heures planifiées vs réelles */}
            <Section title="Heures planifiées vs réelles">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.buckets} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradPlanned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.planned} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.planned} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.real} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.real} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={C.border} />
                  <XAxis dataKey="label" tick={{ fill: C.textSec, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: C.textSec, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tickFormatter={v => `${v}h`}
                  />
                  <Tooltip
                    content={<ChartTooltip formatter={v => fmtH(v)} />}
                    cursor={{ stroke: C.border }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: C.textSec, paddingTop: 8 }}
                    formatter={v => v}
                  />
                  <Area
                    type="monotone"
                    dataKey="plannedHours"
                    name="Planifiées"
                    stroke={C.planned}
                    strokeWidth={2}
                    fill="url(#gradPlanned)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="realHours"
                    name="Réelles"
                    stroke={C.real}
                    strokeWidth={2}
                    fill="url(#gradReal)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Section>
          </div>

          {/* Charts row 2: Presence rate + Absence breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Taux de présence */}
            <Section title="Taux de présence (%)">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.buckets} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={C.border} />
                  <XAxis dataKey="label" tick={{ fill: C.textSec, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: C.textSec, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip
                    content={<ChartTooltip formatter={v => `${v} %`} />}
                    cursor={{ stroke: C.border }}
                  />
                  <ReferenceLine
                    y={80}
                    stroke={C.success}
                    strokeDasharray="5 4"
                    label={{ value: '80 %', fill: C.success, fontSize: 10, position: 'insideTopRight' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="presenceRate"
                    name="Présence"
                    stroke={C.primary}
                    strokeWidth={2}
                    dot={{ fill: C.primary, r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </Section>

            {/* Absences par type */}
            <Section title="Absences par type (jours)">
              {data.absenceByType.length === 0 ? (
                <p className="text-[13px] text-[var(--text-tertiary)] text-center py-10">
                  Aucune absence sur la période
                </p>
              ) : (
                <div className="flex gap-6 items-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.buckets} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke={C.border} />
                      <XAxis dataKey="label" tick={{ fill: C.textSec, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fill: C.textSec, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                        allowDecimals={false}
                      />
                      <Tooltip
                        content={<ChartTooltip formatter={v => `${v}j`} />}
                        cursor={{ fill: C.primaryLt }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: C.textSec, paddingTop: 8 }} />
                      <Bar dataKey="sickDays"  name="Maladie"       fill={C.absence.maladie} stackId="a" radius={[0,0,0,0]} maxBarSize={40} />
                      <Bar dataKey="cpDays"    name="Congés payés"  fill={C.absence.cp}      stackId="a" radius={[0,0,0,0]} maxBarSize={40} />
                      <Bar dataKey="rttDays"   name="RTT"           fill={C.absence.rtt}     stackId="a" radius={[0,0,0,0]} maxBarSize={40} />
                      <Bar dataKey="otherDays" name="Autres"        fill={C.absence.autres}  stackId="a" radius={[4,4,0,0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Section>
          </div>

          {/* Charts row 3: Absence type pie + Turnover */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Répartition absences (donut) */}
            {data.absenceByType.length > 0 && (
              <Section title="Répartition des absences">
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0">
                    <PieChart width={160} height={160}>
                      <Pie
                        data={data.absenceByType}
                        cx={75}
                        cy={75}
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                        dataKey="days"
                        nameKey="type"
                      >
                        {data.absenceByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => [`${Number(v ?? 0)}j`, '']}
                        contentStyle={{ border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12 }}
                      />
                    </PieChart>
                  </div>
                  <div className="space-y-2.5 flex-1">
                    {data.absenceByType.map(t => (
                      <div key={t.type} className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                        <span className="text-[13px] text-[var(--text-secondary)] flex-1">{t.type}</span>
                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">{t.days}j</span>
                        <span className="text-[11px] text-[var(--text-tertiary)] w-10 text-right">
                          {data.kpi.totalAbsenceDays > 0
                            ? `${Math.round(t.days / data.kpi.totalAbsenceDays * 100)} %`
                            : '—'
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            {/* Turnover */}
            <Section title={`Turnover — ${data.kpi.turnoverCount} départ${data.kpi.turnoverCount !== 1 ? 's' : ''}`}>
              <TurnoverSection data={data.turnover} />
            </Section>
          </div>

          {/* Row: Employee stats table + Chronic */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Top employés par coût */}
            <Section title="Employés — coût & présence">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.05em] pb-2 pr-4">Employé</th>
                      <th className="text-right text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.05em] pb-2 px-3">Coût</th>
                      <th className="text-right text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.05em] pb-2 px-3">H. réelles</th>
                      <th className="text-right text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.05em] pb-2 pl-3">Taux abs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.employees.slice(0, 8).map(e => (
                      <tr key={e.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-2.5 pr-4">
                          <p className="font-medium text-[var(--text-primary)]">{e.name}</p>
                          {e.position && <p className="text-[11px] text-[var(--text-secondary)]">{e.position}</p>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-[var(--text-primary)]">{fmtEur(e.laborCost)}</td>
                        <td className="py-2.5 px-3 text-right text-[var(--text-secondary)]">{fmtH(e.realHours)}</td>
                        <td className="py-2.5 pl-3 text-right">
                          <span className={cn(
                            'font-semibold',
                            e.absenceRate >= 20 ? 'text-[#DC2626]' : e.absenceRate >= 10 ? 'text-[#D97706]' : 'text-[var(--text-secondary)]'
                          )}>
                            {e.absenceRate} %
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.employees.length === 0 && (
                  <p className="text-[13px] text-[var(--text-tertiary)] text-center py-6">
                    Aucun employé actif sur la période
                  </p>
                )}
              </div>
            </Section>

            {/* Absentéisme chronique */}
            <Section title={`Absentéisme chronique — ${data.kpi.chronicCount} signalement${data.kpi.chronicCount !== 1 ? 's' : ''}`}>
              <ChronicTable employees={data.employees} />
            </Section>
          </div>

        </>
      )}
    </div>
  )
}
