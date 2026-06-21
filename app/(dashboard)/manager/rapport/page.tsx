'use client'

import { useEffect, useState, useCallback, useMemo, type ComponentType, type CSSProperties } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { getWeekDates, toISODate, getWeekLabel } from '@/lib/utils/dates'
import type { Profile, Shift, LeaveRequest } from '@/types'
import { ChevronLeft, ChevronRight, Loader2, Users, Clock, TrendingUp, CalendarOff, AlarmClock, Download, Banknote } from 'lucide-react'
import type { EmployeeReportRow } from './rapport-pdf'

type LatenessRecord = {
  id: string
  employee_id: string
  date: string
  scheduled_time: string
  actual_time: string
  late_minutes: number
  justified: boolean
  notes: string | null
  profiles: { id: string; full_name: string | null; email: string | null; position: string | null } | null
}

type RapportTab = 'heures' | 'retards' | 'paie'

const PDFButton = dynamic(() => import('./pdf-button'), { ssr: false })

// Sous-titre explicatif par onglet (compréhension au premier coup d'œil).
const TAB_DESC: Record<RapportTab, string> = {
  heures: 'Heures planifiées vs réelles, écart au contrat et coût estimé, par employé.',
  retards: 'Tous les retards pointés sur la période. Marquez-les justifiés ou non.',
  paie: 'Variables de paie prêtes à exporter vers votre logiciel (PayFit, Silae, ADP…).',
}

// Carte de synthèse premium (puce icône + grand chiffre).
function StatCard({
  label, value, icon: Icon, color = 'var(--text-primary)', iconColor = 'var(--accent)',
  iconBg = 'var(--accent-light)', sub, index = 0,
}: {
  label: string
  value: string
  icon?: ComponentType<{ className?: string; style?: CSSProperties }>
  color?: string
  iconColor?: string
  iconBg?: string
  sub?: string
  index?: number
}) {
  return (
    <div
      className="pres-reveal rounded-[14px] p-4"
      style={{ animationDelay: `${index * 50}ms`, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        {Icon && (
          <div className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
            <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
          </div>
        )}
        <span className="text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      </div>
      <p className="text-[24px] font-bold leading-none tabular-nums" style={{ fontFamily: 'var(--font-syne)', color }}>{value}</p>
      {sub && <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
    </div>
  )
}

type Mode = 'day' | 'week' | 'month'

type Presence = {
  id: string
  employee_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  break_minutes_used: number
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function shiftHours(s: Shift): number {
  const start = timeToMin(s.start_time)
  let end = timeToMin(s.end_time)
  if (end < start) end += 1440
  return Math.max(0, (end - start - s.break_minutes) / 60)
}

function presenceHours(p: Presence): number {
  if (!p.clock_in || !p.clock_out) return 0
  const ms = new Date(p.clock_out).getTime() - new Date(p.clock_in).getTime()
  return Math.max(0, ms / 3600000 - p.break_minutes_used / 60)
}

function overlapDays(start1: Date, end1: Date, start2: Date, end2: Date): number {
  const s = Math.max(start1.getTime(), start2.getTime())
  const e = Math.min(end1.getTime(), end2.getTime())
  if (e < s) return 0
  return Math.round((e - s) / 86400000) + 1
}

function contractRefHours(weeklyHours: number | null, start: Date, end: Date): number {
  if (!weeklyHours) return 0
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  return weeklyHours * days / 7
}

function fh(h: number): string {
  const sign = h < 0 ? '-' : ''
  const abs = Math.abs(h)
  const hh = Math.floor(abs)
  const mm = Math.round((abs - hh) * 60)
  return `${sign}${hh}h${mm > 0 ? mm.toString().padStart(2, '0') : ''}`
}

function isoWeekKey(d: Date): string {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  dt.setDate(dt.getDate() + 3 - (dt.getDay() + 6) % 7)
  const w1 = new Date(dt.getFullYear(), 0, 4)
  return `${dt.getFullYear()}-W${String(1 + Math.round(((dt.getTime() - w1.getTime()) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7)).padStart(2, '0')}`
}

type PayeRow = {
  id: string
  name: string | null
  position: string | null
  matricule: string
  normalHours: number
  sup25Hours: number
  sup50Hours: number
  cpDays: number
  rttDays: number
  maladieDays: number
  ssDays: number
  autreDays: number
}

type PayFormat = 'generique' | 'payfit' | 'adp' | 'silae'

function getPeriod(mode: Mode, ref: Date): { start: Date; end: Date; label: string } {
  if (mode === 'day') {
    const label = ref.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    return { start: ref, end: ref, label: label.charAt(0).toUpperCase() + label.slice(1) }
  }
  if (mode === 'week') {
    const dates = getWeekDates(ref)
    return { start: dates[0], end: dates[6], label: getWeekLabel(dates) }
  }
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
  const label = ref.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return { start, end, label: label.charAt(0).toUpperCase() + label.slice(1) }
}

function navigatePeriod(mode: Mode, ref: Date, dir: 1 | -1): Date {
  const d = new Date(ref)
  if (mode === 'day')  { d.setDate(d.getDate() + dir); return d }
  if (mode === 'week') { d.setDate(d.getDate() + dir * 7); return d }
  d.setMonth(d.getMonth() + dir); return d
}

export default function RapportPage() {
  const [mode, setMode] = useState<Mode>('week')
  const [refDate, setRefDate] = useState(new Date())
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [selectedPoste, setSelectedPoste] = useState<string>('all')
  const [employees, setEmployees] = useState<Profile[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [presences, setPresences] = useState<Presence[]>([])
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [hourlyRateMap, setHourlyRateMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [establishmentName, setEstablishmentName] = useState('Mon établissement')
  const [tab, setTab] = useState<RapportTab>('heures')
  const [latenessRecords, setLatenessRecords] = useState<LatenessRecord[]>([])
  const [latenessLoading, setLatenessLoading] = useState(false)
  const [latenessFilter, setLatenessFilter] = useState<'all' | 'justified' | 'unjustified'>('all')
  const [payFormat, setPayFormat] = useState<PayFormat>('generique')
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const period = useMemo(() => getPeriod(mode, refDate), [mode, refDate])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const startStr = toISODate(period.start)
    const endStr = toISODate(period.end)

    const [empRes, shiftRes, presRes, leaveRes, settingRes, contractRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, position, contract_type, weekly_hours').eq('role', 'employee').eq('archived', false).order('full_name'),
      supabase.from('shifts').select('id, employee_id, date, start_time, end_time, break_minutes, position').gte('date', startStr).lte('date', endStr).is('deleted_at', null),
      supabase.from('presences').select('id, employee_id, date, clock_in, clock_out, break_minutes_used').gte('date', startStr).lte('date', endStr),
      supabase.from('leave_requests').select('id, employee_id, start_date, end_date, type').eq('status', 'approved').lte('start_date', endStr).gte('end_date', startStr),
      supabase.from('settings').select('value').eq('key', 'establishment_name').maybeSingle(),
      supabase.from('contracts').select('employee_id, hourly_rate, start_date').is('deleted_at', null).order('start_date', { ascending: false }),
    ])

    setEmployees((empRes.data ?? []) as Profile[])
    setShifts((shiftRes.data ?? []) as Shift[])
    setPresences((presRes.data ?? []) as Presence[])
    setLeaves((leaveRes.data ?? []) as LeaveRequest[])
    if (settingRes.data?.value) setEstablishmentName(settingRes.data.value)

    // Build most-recent hourly rate per employee
    const rateMap: Record<string, number> = {}
    for (const c of contractRes.data ?? []) {
      if (!rateMap[c.employee_id] && c.hourly_rate) rateMap[c.employee_id] = c.hourly_rate
    }
    setHourlyRateMap(rateMap)
    setLoading(false)
  }, [period.start, period.end])

  useEffect(() => { fetchData() }, [fetchData])

  // Fetch lateness for retards tab
  useEffect(() => {
    if (tab !== 'retards') return
    setLatenessLoading(true)
    const startStr = toISODate(period.start)
    const endStr = toISODate(period.end)
    const empParam = selectedEmployee !== 'all' ? `&employee_id=${selectedEmployee}` : ''
    fetch(`/api/lateness?from=${startStr}&to=${endStr}${empParam}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setLatenessRecords(Array.isArray(d) ? d : []); setLatenessLoading(false) })
      .catch(() => setLatenessLoading(false))
  }, [tab, period.start, period.end, selectedEmployee])

  const postes = useMemo(() => {
    const seen = new Set<string>()
    employees.forEach(e => { if (e.position) seen.add(e.position) })
    return Array.from(seen).sort()
  }, [employees])

  const presenceRate = useMemo(() => {
    const filteredShifts = selectedEmployee === 'all' ? shifts : shifts.filter(s => s.employee_id === selectedEmployee)
    if (filteredShifts.length === 0) return null
    const present = filteredShifts.filter(s =>
      presences.some(p => p.employee_id === s.employee_id && p.date === s.date)
    ).length
    return Math.round(present / filteredShifts.length * 100)
  }, [shifts, presences, selectedEmployee])

  const rows: EmployeeReportRow[] = useMemo(() => {
    const filtered = employees
      .filter(e => selectedEmployee === 'all' || e.id === selectedEmployee)
      .filter(e => selectedPoste === 'all' || e.position === selectedPoste)
    return filtered.map(emp => {
      const empShifts = shifts.filter(s => s.employee_id === emp.id)
      const empPresences = presences.filter(p => p.employee_id === emp.id)
      const empLeaves = leaves.filter(l => l.employee_id === emp.id)

      const plannedHours = empShifts.reduce((s, sh) => s + shiftHours(sh), 0)
      const realHours = empPresences.reduce((s, p) => s + presenceHours(p), 0)
      const refHours = contractRefHours(emp.weekly_hours, period.start, period.end)
      const diffHours = plannedHours - refHours
      const plannedDays = new Set(empShifts.map(s => s.date)).size
      const totalBreakMinutes = empShifts.reduce((s, sh) => s + sh.break_minutes, 0)

      const absenceCP      = empLeaves.filter(l => l.type === 'CP').reduce((s, l) => s + overlapDays(period.start, period.end, new Date(l.start_date), new Date(l.end_date)), 0)
      const absenceRTT     = empLeaves.filter(l => l.type === 'RTT').reduce((s, l) => s + overlapDays(period.start, period.end, new Date(l.start_date), new Date(l.end_date)), 0)
      const absenceMaladie = empLeaves.filter(l => l.type === 'maladie').reduce((s, l) => s + overlapDays(period.start, period.end, new Date(l.start_date), new Date(l.end_date)), 0)
      const absenceSS      = empLeaves.filter(l => l.type === 'sans_solde').reduce((s, l) => s + overlapDays(period.start, period.end, new Date(l.start_date), new Date(l.end_date)), 0)
      const absenceAutre   = empLeaves.filter(l => l.type === 'autre').reduce((s, l) => s + overlapDays(period.start, period.end, new Date(l.start_date), new Date(l.end_date)), 0)

      const hourlyRate = hourlyRateMap[emp.id] ?? null
      const estimatedCost = hourlyRate && realHours > 0 ? realHours * hourlyRate : null

      return {
        id: emp.id,
        name: emp.full_name ?? emp.email,
        position: emp.position,
        contractType: emp.contract_type,
        weeklyHours: emp.weekly_hours,
        plannedHours,
        realHours,
        contractRefHours: refHours,
        diffHours,
        plannedDays,
        totalBreakMinutes,
        absenceCP, absenceRTT, absenceMaladie, absenceSS, absenceAutre,
        hourlyRate,
        estimatedCost,
      }
    })
  }, [employees, shifts, presences, leaves, selectedEmployee, selectedPoste, hourlyRateMap, period])

  const totals = useMemo(() => {
    const totalCost = rows.reduce((s, r) => s + (r.estimatedCost ?? 0), 0)
    return {
      employees: rows.length,
      plannedHours: rows.reduce((s, r) => s + r.plannedHours, 0),
      realHours: rows.reduce((s, r) => s + r.realHours, 0),
      diffHours: rows.reduce((s, r) => s + r.diffHours, 0),
      absences: rows.reduce((s, r) => s + r.absenceCP + r.absenceRTT + r.absenceMaladie + r.absenceSS + r.absenceAutre, 0),
      totalCost,
      hasCost: rows.some(r => r.estimatedCost !== null),
    }
  }, [rows])

  const filteredLateness = useMemo(() => {
    if (latenessFilter === 'justified') return latenessRecords.filter(r => r.justified)
    if (latenessFilter === 'unjustified') return latenessRecords.filter(r => !r.justified)
    return latenessRecords
  }, [latenessRecords, latenessFilter])

  const paieRows: PayeRow[] = useMemo(() => {
    const filtered = employees
      .filter(e => selectedEmployee === 'all' || e.id === selectedEmployee)
      .filter(e => selectedPoste === 'all' || e.position === selectedPoste)
    return filtered.map((emp, idx) => {
      const refWeekH  = emp.weekly_hours ?? 35
      const empShifts = shifts.filter(s => s.employee_id === emp.id)
      const empLeaves = leaves.filter(l => l.employee_id === emp.id)

      const byWeek = new Map<string, Shift[]>()
      for (const s of empShifts) {
        const wk = isoWeekKey(new Date(s.date))
        if (!byWeek.has(wk)) byWeek.set(wk, [])
        byWeek.get(wk)!.push(s)
      }
      let normalHours = 0, sup25Hours = 0, sup50Hours = 0
      Array.from(byWeek.values()).forEach(wkShifts => {
        const weekH = wkShifts.reduce((s: number, sh: Shift) => s + shiftHours(sh), 0)
        const norm  = Math.min(weekH, refWeekH)
        const sup   = Math.max(0, weekH - refWeekH)
        normalHours  += norm
        sup25Hours   += Math.min(sup, 8)
        sup50Hours   += Math.max(0, sup - 8)
      })

      const countDays = (type: string) =>
        empLeaves.filter(l => l.type === type).reduce((s, l) => s + overlapDays(period.start, period.end, new Date(l.start_date), new Date(l.end_date)), 0)

      return {
        id:           emp.id,
        name:         emp.full_name ?? (emp as Profile & { email?: string }).email ?? null,
        position:     emp.position ?? null,
        matricule:    `EMP${String(idx + 1).padStart(3, '0')}`,
        normalHours,
        sup25Hours,
        sup50Hours,
        cpDays:       countDays('CP'),
        rttDays:      countDays('RTT'),
        maladieDays:  countDays('maladie'),
        ssDays:       countDays('sans_solde'),
        autreDays:    countDays('autre'),
      }
    })
  }, [employees, shifts, leaves, selectedEmployee, selectedPoste, period])

  const handleExportCsv = useCallback(async () => {
    setExportLoading(true)
    setExportError(null)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 25000)
    try {
      const url = `/api/exports?type=paie&from=${toISODate(period.start)}&to=${toISODate(period.end)}&format=${payFormat}`
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) throw new Error('server')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `variables_paie_${toISODate(period.start)}_${toISODate(period.end)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setExportError("L'export prend trop de temps. Essayez avec une période plus courte.")
      } else {
        setExportError("Erreur lors de l'export. Veuillez réessayer.")
      }
    } finally {
      clearTimeout(timer)
      setExportLoading(false)
    }
  }, [period.start, period.end, payFormat])

  const toggleJustified = useCallback(async (record: LatenessRecord) => {
    const res = await fetch(`/api/lateness/${record.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justified: !record.justified }),
    })
    if (res.ok) {
      setLatenessRecords(prev => prev.map(r => r.id === record.id ? { ...r, justified: !r.justified } : r))
    }
  }, [])

  return (
    <div className="min-h-full">
      {/* Sticky header */}
      <div className="border-b border-border bg-card sticky top-14 md:top-11 z-10">
        <div className="px-4 md:px-6 max-w-6xl mx-auto py-3 space-y-3">

          {/* Étage 1 — Quel rapport (primaire) */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[22px] font-bold tracking-[-0.02em] shrink-0" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>Rapport</h1>

            <div className="flex gap-0.5 p-0.5 rounded-[11px]" style={{ backgroundColor: 'var(--bg-input)' }}>
              {([
                { id: 'heures' as RapportTab, label: 'Heures', icon: Clock },
                { id: 'retards' as RapportTab, label: 'Retards', icon: AlarmClock },
                { id: 'paie' as RapportTab, label: 'Paie', icon: Banknote },
              ]).map(({ id, label, icon: Icon }) => {
                const active = tab === id
                return (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold rounded-[9px] transition-all duration-150"
                    style={{
                      backgroundColor: active ? 'var(--bg-card)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-tertiary)',
                      boxShadow: active ? '0 1px 3px rgba(16,24,40,0.12)' : 'none',
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                )
              })}
            </div>

            {tab === 'heures' && (
              <div className="ml-auto">
                <PDFButton rows={rows} periodLabel={period.label} establishmentName={establishmentName} />
              </div>
            )}
          </div>

          {/* Étage 2 — Période + filtres (secondaire) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex overflow-hidden rounded-[8px]" style={{ border: '1px solid var(--border)' }}>
              {(['day', 'week', 'month'] as Mode[]).map((m, i) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="px-3 py-1 text-[12px] font-medium transition-colors duration-150"
                  style={{
                    backgroundColor: mode === m ? 'var(--accent-light)' : 'transparent',
                    color: mode === m ? 'var(--accent)' : 'var(--text-tertiary)',
                    borderLeft: i > 0 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  {m === 'day' ? 'Jour' : m === 'week' ? 'Semaine' : 'Mois'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setRefDate(d => navigatePeriod(mode, d, -1))}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-input)]"
              >
                <ChevronLeft className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
              <span className="text-[13px] font-semibold capitalize text-center px-1" style={{ minWidth: 150, color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
                {period.label}
              </span>
              <button
                onClick={() => setRefDate(d => navigatePeriod(mode, d, 1))}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-input)]"
              >
                <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {postes.length > 0 && (
                <select
                  value={selectedPoste}
                  onChange={e => setSelectedPoste(e.target.value)}
                  className="text-[12px] rounded-lg px-2.5 py-1.5 focus:outline-none"
                  style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                >
                  <option value="all">Tous les postes</option>
                  {postes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
              <select
                value={selectedEmployee}
                onChange={e => setSelectedEmployee(e.target.value)}
                className="text-[12px] rounded-lg px-2.5 py-1.5 focus:outline-none"
                style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}
              >
                <option value="all">Tous les employés</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.full_name ?? e.email}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 md:px-6 md:py-6 max-w-6xl mx-auto space-y-6">
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{TAB_DESC[tab]}</p>

        {tab === 'retards' && (
          <>
            {/* Retards summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: AlarmClock, label: 'Total retards', value: latenessRecords.length.toString(), danger: false },
                { icon: Clock, label: 'Minutes perdues', value: latenessRecords.reduce((s, r) => s + r.late_minutes, 0) + ' min', danger: false },
                { icon: TrendingUp, label: 'Non justifiés', value: latenessRecords.filter(r => !r.justified).length.toString(), danger: latenessRecords.some(r => !r.justified) },
              ].map(({ icon: Icon, label, value, danger }, i) => (
                <StatCard
                  key={label}
                  icon={Icon}
                  label={label}
                  value={value}
                  index={i}
                  color={danger ? 'var(--danger)' : 'var(--text-primary)'}
                  iconColor={danger ? 'var(--danger)' : 'var(--accent)'}
                  iconBg={danger ? 'rgba(255,107,107,0.12)' : 'var(--accent-light)'}
                />
              ))}
            </div>

            {/* Retards filter + table */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Filtrer :</span>
              {(['all', 'justified', 'unjustified'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setLatenessFilter(f)}
                  className="px-3 py-1 text-[13px] rounded-full transition-colors duration-150"
                  style={{
                    border: latenessFilter === f ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
                    backgroundColor: latenessFilter === f ? 'var(--accent-light)' : 'transparent',
                    color: latenessFilter === f ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {f === 'all' ? 'Tous' : f === 'justified' ? 'Justifiés' : 'Non justifiés'}
                </button>
              ))}
            </div>

            {latenessLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLateness.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl bg-card">
                <AlarmClock className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground">Aucun retard pour cette période</p>
                <p className="text-xs text-muted-foreground mt-1">Tous les employés sont à l&apos;heure.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 border-b border-border">
                        {['Employé', 'Date', 'Planifié', 'Arrivée', 'Retard', 'Statut'].map(h => (
                          <th key={h} className={cn(
                            'px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left',
                            h === 'Retard' && 'text-right',
                          )}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLateness.map((rec, i) => (
                        <tr key={rec.id} className={cn('border-b border-border/60 hover:bg-muted/30 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground leading-tight">{rec.profiles?.full_name ?? rec.profiles?.email ?? '—'}</p>
                            {rec.profiles?.position && <p className="text-xs text-muted-foreground">{rec.profiles.position}</p>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(rec.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {rec.scheduled_time.slice(0, 5)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(rec.actual_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-medium" style={{ color: 'var(--warning)' }}>+{rec.late_minutes} min</span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleJustified(rec)}
                              className="text-xs font-medium px-2.5 py-1 rounded-full transition-colors duration-150"
                              style={rec.justified
                                ? { backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '0.5px solid var(--accent)' }
                                : { backgroundColor: 'rgba(255,107,107,0.12)', color: 'var(--danger)', border: '1px solid rgba(255,107,107,0.3)' }
                              }
                            >
                              {rec.justified ? 'Justifié' : 'Non justifié'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'paie' && (
          <>
            {/* Export controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Format :</span>
              {(['generique', 'payfit', 'adp', 'silae'] as PayFormat[]).map(f => (
                <button
                  key={f}
                  onClick={() => setPayFormat(f)}
                  className="px-3 py-1 text-[13px] rounded-full transition-colors duration-150"
                  style={{
                    border: payFormat === f ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
                    backgroundColor: payFormat === f ? 'var(--accent-light)' : 'transparent',
                    color: payFormat === f ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {f === 'generique' ? 'Générique' : f === 'payfit' ? 'PayFit' : f === 'adp' ? 'ADP Decidium' : 'Silae'}
                </button>
              ))}
              <div className="ml-auto flex flex-col items-end gap-1">
                <button
                  onClick={handleExportCsv}
                  disabled={exportLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                >
                  {exportLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Download className="h-3.5 w-3.5" />
                  }
                  {exportLoading ? 'Export…' : 'Exporter CSV'}
                </button>
                {exportError && (
                  <p className="text-[11px]" style={{ color: 'var(--danger)' }}>{exportError}</p>
                )}
              </div>
            </div>

            {/* Paie summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'H. normales', value: fh(paieRows.reduce((s, r) => s + r.normalHours, 0)), color: 'var(--text-primary)' },
                { label: 'H. sup. 25%', value: fh(paieRows.reduce((s, r) => s + r.sup25Hours, 0)), color: 'var(--warning)' },
                { label: 'H. sup. 50%', value: fh(paieRows.reduce((s, r) => s + r.sup50Hours, 0)), color: 'var(--danger)' },
                { label: 'J. d\'absence', value: String(paieRows.reduce((s, r) => s + r.cpDays + r.rttDays + r.maladieDays + r.ssDays + r.autreDays, 0)), color: 'var(--text-primary)' },
              ].map(({ label, value, color }, i) => (
                <StatCard key={label} label={label} value={value} color={color} index={i} />
              ))}
            </div>

            {/* Paie table */}
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : paieRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl bg-card">
                <Banknote className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground">Aucune donnée pour cette période</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 border-b border-border">
                        {['Matricule', 'Employé', 'H. normales', 'H. sup 25%', 'H. sup 50%', 'CP', 'RTT', 'Maladie', 'Sans solde', 'Autre'].map((h, i) => (
                          <th key={h} className={cn(
                            'px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide',
                            i >= 2 ? 'text-right' : 'text-left',
                          )}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paieRows.map((row, i) => (
                        <tr key={row.id} className={cn('border-b border-border/60 hover:bg-muted/30 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{row.matricule}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground leading-tight">{row.name}</p>
                            {row.position && <p className="text-xs text-muted-foreground">{row.position}</p>}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-foreground">{row.normalHours > 0 ? fh(row.normalHours) : '—'}</td>
                          <td className="px-4 py-3 text-right">
                            {row.sup25Hours > 0
                              ? <span className="font-medium" style={{ color: 'var(--warning)' }}>{fh(row.sup25Hours)}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.sup50Hours > 0
                              ? <span className="font-medium" style={{ color: 'var(--danger)' }}>{fh(row.sup50Hours)}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.cpDays > 0 ? `${row.cpDays}j` : '—'}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.rttDays > 0 ? `${row.rttDays}j` : '—'}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.maladieDays > 0 ? `${row.maladieDays}j` : '—'}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.ssDays > 0 ? `${row.ssDays}j` : '—'}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{row.autreDays > 0 ? `${row.autreDays}j` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    {paieRows.length > 1 && (
                      <tfoot>
                        <tr className="bg-muted/60 border-t-2 border-border">
                          <td colSpan={2} className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Total</td>
                          <td className="px-4 py-3 text-right font-bold text-foreground">{fh(paieRows.reduce((s, r) => s + r.normalHours, 0))}</td>
                          <td className="px-4 py-3 text-right font-bold" style={{ color: 'var(--warning)' }}>{fh(paieRows.reduce((s, r) => s + r.sup25Hours, 0))}</td>
                          <td className="px-4 py-3 text-right font-bold" style={{ color: 'var(--danger)' }}>{fh(paieRows.reduce((s, r) => s + r.sup50Hours, 0))}</td>
                          <td className="px-4 py-3 text-right font-medium text-muted-foreground">{paieRows.reduce((s, r) => s + r.cpDays, 0) || '—'}</td>
                          <td className="px-4 py-3 text-right font-medium text-muted-foreground">{paieRows.reduce((s, r) => s + r.rttDays, 0) || '—'}</td>
                          <td className="px-4 py-3 text-right font-medium text-muted-foreground">{paieRows.reduce((s, r) => s + r.maladieDays, 0) || '—'}</td>
                          <td className="px-4 py-3 text-right font-medium text-muted-foreground">{paieRows.reduce((s, r) => s + r.ssDays, 0) || '—'}</td>
                          <td className="px-4 py-3 text-right font-medium text-muted-foreground">{paieRows.reduce((s, r) => s + r.autreDays, 0) || '—'}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'heures' && (
        <>
        {/* Summary cards */}
        <div className={cn('grid gap-4', totals.hasCost ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-5')}>
          <StatCard index={0} icon={Users} label="Employés" value={String(totals.employees)} />
          <StatCard index={1} icon={Clock} label="H. planifiées" value={fh(totals.plannedHours)} sub={totals.realHours > 0 ? `${fh(totals.realHours)} réelles` : undefined} />
          <StatCard
            index={2}
            icon={TrendingUp}
            label="Écart contrat"
            value={`${totals.diffHours >= 0 ? '+' : ''}${fh(totals.diffHours)}`}
            color={totals.diffHours > 0.1 ? 'var(--success)' : totals.diffHours < -0.1 ? 'var(--danger)' : 'var(--text-primary)'}
          />
          <StatCard index={3} icon={CalendarOff} label="J. d'absence" value={String(totals.absences)} />
          <StatCard
            index={4}
            icon={TrendingUp}
            label="Taux présence"
            value={presenceRate === null ? '—' : `${presenceRate}%`}
            color={presenceRate === null ? 'var(--text-tertiary)' : presenceRate >= 80 ? 'var(--success)' : presenceRate >= 60 ? 'var(--warning)' : 'var(--danger)'}
          />
          {totals.hasCost && (
            <StatCard
              index={5}
              icon={Banknote}
              label="Coût estimé"
              value={`${totals.totalCost.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`}
            />
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl bg-card">
            <Users className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">Aucune donnée pour cette période</p>
            <p className="text-xs text-muted-foreground mt-1">Aucun shift ou présence enregistré.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b border-border">
                    {['Employé', 'Contrat', 'H. planif.', 'H. réelles', 'H. contrat', 'Écart', 'Jours', 'Pauses', ...(totals.hasCost ? ['Coût'] : []), 'Absences'].map(h => (
                      <th key={h} className={cn(
                        'px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide',
                        ['H. planif.', 'H. réelles', 'H. contrat', 'Écart', 'Jours', 'Pauses', 'Coût'].includes(h) ? 'text-right' : 'text-left',
                      )}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const totalAbs = row.absenceCP + row.absenceRTT + row.absenceMaladie + row.absenceSS + row.absenceAutre
                    return (
                      <tr key={row.id} className={cn('border-b border-border/60 hover:bg-muted/30 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground leading-tight">{row.name}</p>
                          {row.position && <p className="text-xs text-muted-foreground">{row.position}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground">{row.contractType ?? '—'}</p>
                          {row.weeklyHours && <p className="text-xs text-muted-foreground">{row.weeklyHours}h/sem.</p>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{fh(row.plannedHours)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{row.realHours > 0 ? fh(row.realHours) : '—'}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{row.contractRefHours > 0.1 ? fh(row.contractRefHours) : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-medium" style={{ color: row.diffHours > 0.1 ? 'var(--success)' : row.diffHours < -0.1 ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                            {row.contractRefHours > 0.1 ? `${row.diffHours >= 0 ? '+' : ''}${fh(row.diffHours)}` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-foreground">{row.plannedDays > 0 ? `${row.plannedDays}j` : '—'}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{row.totalBreakMinutes > 0 ? `${row.totalBreakMinutes}min` : '—'}</td>
                        {totals.hasCost && (
                          <td className="px-4 py-3 text-right">
                            {row.estimatedCost
                              ? <span className="font-medium text-foreground">{row.estimatedCost.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </td>
                        )}
                        <td className="px-4 py-3">
                          {totalAbs === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {row.absenceCP > 0      && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>CP {row.absenceCP}j</span>}
                              {row.absenceRTT > 0     && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>RTT {row.absenceRTT}j</span>}
                              {row.absenceMaladie > 0 && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,179,71,0.15)', color: 'var(--warning)' }}>Mal. {row.absenceMaladie}j</span>}
                              {row.absenceSS > 0      && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,107,107,0.12)', color: 'var(--danger)' }}>SS {row.absenceSS}j</span>}
                              {row.absenceAutre > 0   && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }}>Autre {row.absenceAutre}j</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {rows.length > 1 && (
                  <tfoot>
                    <tr className="bg-muted/60 border-t-2 border-border">
                      <td className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide" colSpan={2}>Total</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">{fh(totals.plannedHours)}</td>
                      <td className="px-4 py-3 text-right font-medium text-muted-foreground">{totals.realHours > 0 ? fh(totals.realHours) : '—'}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold" style={{ color: totals.diffHours > 0.1 ? 'var(--success)' : totals.diffHours < -0.1 ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                          {totals.diffHours >= 0 ? '+' : ''}{fh(totals.diffHours)}
                        </span>
                      </td>
                      <td colSpan={2} />
                      {totals.hasCost && (
                        <td className="px-4 py-3 text-right font-bold text-foreground">
                          {totals.totalCost.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </td>
                      )}
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}
