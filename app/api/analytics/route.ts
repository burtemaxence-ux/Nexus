import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireManager } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export type PeriodBucket = {
  key: string
  label: string
  plannedHours: number
  realHours: number
  laborCost: number
  absenceDays: number
  sickDays: number
  cpDays: number
  rttDays: number
  otherDays: number
  presenceRate: number | null
}

export type EmployeeAnalytics = {
  id: string
  name: string
  position: string | null
  contractType: string | null
  weeklyHours: number | null
  plannedHours: number
  realHours: number
  laborCost: number
  absenceDays: number
  sickLeaveCount: number
  latenessCount: number
  unjustifiedLateCount: number
  absenceRate: number
  flags: ('sick_frequent' | 'late_chronic' | 'absence_high')[]
}

export type TurnoverEntry = {
  name: string
  position: string | null
  contractType: string | null
  monthKey: string
  monthLabel: string
}

export type AbsenceTypeEntry = {
  type: string
  days: number
  color: string
}

export type AnalyticsPayload = {
  periodLabel: string
  periodStart: string
  periodEnd: string
  granularity: 'week' | 'month'
  kpi: {
    totalLaborCost: number
    totalPlannedHours: number
    totalRealHours: number
    avgPresenceRate: number
    totalAbsenceDays: number
    totalSickDays: number
    totalLatenessCount: number
    turnoverCount: number
    activeEmployees: number
    chronicCount: number
  }
  buckets: PeriodBucket[]
  employees: EmployeeAnalytics[]
  turnover: TurnoverEntry[]
  absenceByType: AbsenceTypeEntry[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcShiftHours(start: string, end: string, brk: number): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let min = (eh * 60 + em) - (sh * 60 + sm)
  if (min < 0) min += 1440
  return Math.max(0, (min - brk) / 60)
}

function calcPresenceHours(clockIn: string | null, clockOut: string | null, brk: number): number {
  if (!clockIn || !clockOut) return 0
  const diff = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60000
  return Math.max(0, (diff - brk) / 60)
}

function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().split('T')[0]
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}

function countOverlapDays(startDate: string, endDate: string, rangeStart: Date, rangeEnd: Date): number {
  const s = new Date(Math.max(new Date(startDate + 'T00:00:00').getTime(), rangeStart.getTime()))
  const e = new Date(Math.min(new Date(endDate + 'T23:59:59').getTime(), rangeEnd.getTime()))
  if (e < s) return 0
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
}

function weekMondayLabel(key: string): string {
  const d = new Date(key + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function monthLabel(key: string): string {
  const d = new Date(key + '-01T00:00:00')
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

// ── Period config ─────────────────────────────────────────────────────────────

const PERIODS = {
  '4w':  { days: 28,  granularity: 'week'  as const },
  '3m':  { days: 91,  granularity: 'week'  as const },
  '6m':  { days: 182, granularity: 'month' as const },
  '12m': { days: 365, granularity: 'month' as const },
} as const

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
  const supabase = await createClient()
  const { profile } = await requireManager(supabase)

  const establishmentId = profile.active_establishment_id ?? profile.establishment_id
  if (!establishmentId) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 400 })

  const periodKey = (new URL(req.url).searchParams.get('period') ?? '3m') as keyof typeof PERIODS
  const cfg = PERIODS[periodKey] ?? PERIODS['3m']

  const periodEnd = new Date()
  periodEnd.setHours(23, 59, 59, 999)
  const periodStart = new Date(periodEnd)
  periodStart.setDate(periodStart.getDate() - cfg.days + 1)
  periodStart.setHours(0, 0, 0, 0)

  const startStr = periodStart.toISOString().split('T')[0]
  const endStr   = periodEnd.toISOString().split('T')[0]

  // ── Fetch all data in parallel ────────────────────────────────────────────
  const [
    { data: employees },
    { data: archivedInPeriod },
    { data: shifts },
    { data: presences },
    { data: leaves },
    { data: lateness },
    { data: contracts },
  ] = await Promise.all([
    supabaseAdmin.from('profiles')
      .select('id, full_name, position, contract_type, weekly_hours')
      .eq('establishment_id', establishmentId)
      .eq('role', 'employee')
      .eq('archived', false),

    supabaseAdmin.from('profiles')
      .select('id, full_name, position, contract_type, updated_at')
      .eq('establishment_id', establishmentId)
      .eq('role', 'employee')
      .eq('archived', true)
      .gte('updated_at', startStr),

    supabaseAdmin.from('shifts')
      .select('id, employee_id, date, start_time, end_time, break_minutes')
      .eq('establishment_id', establishmentId)
      .gte('date', startStr)
      .lte('date', endStr)
      .is('deleted_at', null),

    supabaseAdmin.from('presences')
      .select('employee_id, date, clock_in, clock_out, break_minutes_used')
      .eq('establishment_id', establishmentId)
      .gte('date', startStr)
      .lte('date', endStr),

    supabaseAdmin.from('leave_requests')
      .select('id, employee_id, type, start_date, end_date')
      .eq('establishment_id', establishmentId)
      .eq('status', 'approved')
      .lte('start_date', endStr)
      .gte('end_date', startStr),

    supabaseAdmin.from('lateness_records')
      .select('employee_id, date, late_minutes, justified')
      .eq('establishment_id', establishmentId)
      .gte('date', startStr)
      .lte('date', endStr),

    supabaseAdmin.from('contracts')
      .select('employee_id, hourly_rate, start_date')
      .eq('establishment_id', establishmentId)
      .is('deleted_at', null)
      .not('hourly_rate', 'is', null)
      .order('start_date', { ascending: false }),
  ])

  // ── Build lookup maps ────────────────────────────────────────────────────
  const hourlyRateMap = new Map<string, number>()
  for (const c of contracts ?? []) {
    if (!hourlyRateMap.has(c.employee_id) && c.hourly_rate) {
      hourlyRateMap.set(c.employee_id, Number(c.hourly_rate))
    }
  }

  const presenceMap = new Map<string, { clock_in: string | null; clock_out: string | null; break_minutes_used: number }>()
  for (const p of presences ?? []) {
    presenceMap.set(`${p.employee_id}__${p.date}`, p)
  }

  // ── Generate bucket skeleton ─────────────────────────────────────────────

  type BucketAccum = {
    label: string
    plannedHours: number
    realHours: number
    laborCost: number
    absenceDays: number
    sickDays: number
    cpDays: number
    rttDays: number
    otherDays: number
    shiftsCount: number
    presenceCount: number
  }

  const bucketMap = new Map<string, BucketAccum>()

  {
    const cursor = new Date(periodStart)
    while (cursor <= periodEnd) {
      const key = cfg.granularity === 'week'
        ? getWeekMonday(cursor.toISOString().split('T')[0])
        : getMonthKey(cursor.toISOString().split('T')[0])

      if (!bucketMap.has(key)) {
        bucketMap.set(key, {
          label: cfg.granularity === 'week' ? weekMondayLabel(key) : monthLabel(key),
          plannedHours: 0, realHours: 0, laborCost: 0,
          absenceDays: 0, sickDays: 0, cpDays: 0, rttDays: 0, otherDays: 0,
          shiftsCount: 0, presenceCount: 0,
        })
      }
      if (cfg.granularity === 'week') {
        cursor.setDate(cursor.getDate() + 7)
      } else {
        cursor.setMonth(cursor.getMonth() + 1)
      }
    }
  }

  // ── Aggregate shifts → buckets ───────────────────────────────────────────
  for (const shift of shifts ?? []) {
    const key = cfg.granularity === 'week' ? getWeekMonday(shift.date) : getMonthKey(shift.date)
    const b = bucketMap.get(key)
    if (!b) continue

    const planned = calcShiftHours(shift.start_time, shift.end_time, shift.break_minutes)
    b.plannedHours += planned
    b.shiftsCount++

    const pres = presenceMap.get(`${shift.employee_id}__${shift.date}`)
    const real  = pres ? calcPresenceHours(pres.clock_in, pres.clock_out, pres.break_minutes_used) : 0
    b.realHours += real
    if (pres?.clock_in) b.presenceCount++

    const rate = hourlyRateMap.get(shift.employee_id) ?? 0
    b.laborCost += (real > 0 ? real : planned) * rate
  }

  // ── Aggregate leaves → buckets ───────────────────────────────────────────
  for (const leave of leaves ?? []) {
    for (const [key, b] of Array.from(bucketMap.entries())) {
      // compute bucket date range
      let bStart: Date, bEnd: Date
      if (cfg.granularity === 'week') {
        bStart = new Date(key + 'T00:00:00')
        bEnd   = new Date(bStart); bEnd.setDate(bEnd.getDate() + 6)
      } else {
        bStart = new Date(key + '-01T00:00:00')
        bEnd   = new Date(bStart.getFullYear(), bStart.getMonth() + 1, 0)
      }
      const overlap = countOverlapDays(leave.start_date, leave.end_date, bStart, bEnd)
      if (overlap <= 0) continue

      b.absenceDays += overlap
      if      (leave.type === 'maladie')    b.sickDays  += overlap
      else if (leave.type === 'CP')         b.cpDays    += overlap
      else if (leave.type === 'RTT')        b.rttDays   += overlap
      else                                  b.otherDays += overlap
    }
  }

  // ── Finalize buckets array ───────────────────────────────────────────────
  const buckets: PeriodBucket[] = Array.from(bucketMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, b]) => ({
      key,
      label: b.label,
      plannedHours: Math.round(b.plannedHours * 10) / 10,
      realHours:    Math.round(b.realHours * 10) / 10,
      laborCost:    Math.round(b.laborCost),
      absenceDays:  b.absenceDays,
      sickDays:     b.sickDays,
      cpDays:       b.cpDays,
      rttDays:      b.rttDays,
      otherDays:    b.otherDays,
      presenceRate: b.shiftsCount > 0
        ? Math.round(b.presenceCount / b.shiftsCount * 100)
        : null,
    }))

  // ── Per-employee aggregation ─────────────────────────────────────────────
  type EmpAccum = {
    planned: number; real: number; cost: number
    shiftsCount: number; presenceCount: number
    absenceDays: number; sickLeaveCount: number
    latenessCount: number; unjustifiedLateCount: number
  }

  const empAccum = new Map<string, EmpAccum>()
  for (const emp of employees ?? []) {
    empAccum.set(emp.id, {
      planned: 0, real: 0, cost: 0,
      shiftsCount: 0, presenceCount: 0,
      absenceDays: 0, sickLeaveCount: 0,
      latenessCount: 0, unjustifiedLateCount: 0,
    })
  }

  for (const shift of shifts ?? []) {
    const e = empAccum.get(shift.employee_id)
    if (!e) continue
    const planned = calcShiftHours(shift.start_time, shift.end_time, shift.break_minutes)
    e.planned += planned; e.shiftsCount++
    const pres = presenceMap.get(`${shift.employee_id}__${shift.date}`)
    const real  = pres ? calcPresenceHours(pres.clock_in, pres.clock_out, pres.break_minutes_used) : 0
    e.real += real
    if (pres?.clock_in) e.presenceCount++
    e.cost += (real > 0 ? real : planned) * (hourlyRateMap.get(shift.employee_id) ?? 0)
  }

  for (const leave of leaves ?? []) {
    const e = empAccum.get(leave.employee_id)
    if (!e) continue
    const d = countOverlapDays(leave.start_date, leave.end_date, periodStart, periodEnd)
    e.absenceDays += d
    if (leave.type === 'maladie') e.sickLeaveCount++
  }

  for (const l of lateness ?? []) {
    const e = empAccum.get(l.employee_id)
    if (!e) continue
    e.latenessCount++
    if (!l.justified) e.unjustifiedLateCount++
  }

  const totalWorkingDays = Math.round(cfg.days * 5 / 7)

  const employeeStats: EmployeeAnalytics[] = (employees ?? []).map(emp => {
    const e = empAccum.get(emp.id) ?? { planned: 0, real: 0, cost: 0, shiftsCount: 0, presenceCount: 0, absenceDays: 0, sickLeaveCount: 0, latenessCount: 0, unjustifiedLateCount: 0 }
    const absenceRate = totalWorkingDays > 0 ? Math.min(100, Math.round(e.absenceDays / totalWorkingDays * 100)) : 0

    const flags: EmployeeAnalytics['flags'] = []
    if (e.sickLeaveCount >= 3)        flags.push('sick_frequent')
    if (e.unjustifiedLateCount >= 5)  flags.push('late_chronic')
    if (absenceRate >= 20)            flags.push('absence_high')

    return {
      id: emp.id,
      name: emp.full_name ?? 'Employé',
      position: emp.position ?? null,
      contractType: (emp.contract_type as string | null) ?? null,
      weeklyHours: emp.weekly_hours ? Number(emp.weekly_hours) : null,
      plannedHours: Math.round(e.planned * 10) / 10,
      realHours:    Math.round(e.real * 10) / 10,
      laborCost:    Math.round(e.cost),
      absenceDays:  e.absenceDays,
      sickLeaveCount: e.sickLeaveCount,
      latenessCount: e.latenessCount,
      unjustifiedLateCount: e.unjustifiedLateCount,
      absenceRate,
      flags,
    }
  }).sort((a, b) => b.flags.length - a.flags.length || b.absenceRate - a.absenceRate)

  // ── Turnover ─────────────────────────────────────────────────────────────
  const turnover: TurnoverEntry[] = (archivedInPeriod ?? []).map(emp => {
    const d = new Date(emp.updated_at)
    return {
      name: emp.full_name ?? 'Employé',
      position: emp.position ?? null,
      contractType: (emp.contract_type as string | null) ?? null,
      monthKey:   d.toISOString().slice(0, 7),
      monthLabel: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    }
  })

  // ── KPI summary ───────────────────────────────────────────────────────────
  const totalLaborCost    = buckets.reduce((s, b) => s + b.laborCost, 0)
  const totalPlannedHours = Math.round(buckets.reduce((s, b) => s + b.plannedHours, 0) * 10) / 10
  const totalRealHours    = Math.round(buckets.reduce((s, b) => s + b.realHours, 0) * 10) / 10
  const totalAbsenceDays  = buckets.reduce((s, b) => s + b.absenceDays, 0)
  const totalSickDays     = buckets.reduce((s, b) => s + b.sickDays, 0)
  const totalLatenessCount = (lateness ?? []).filter(l => !l.justified).length

  const ratedBuckets = buckets.filter(b => b.presenceRate !== null)
  const avgPresenceRate = ratedBuckets.length > 0
    ? Math.round(ratedBuckets.reduce((s, b) => s + (b.presenceRate ?? 0), 0) / ratedBuckets.length)
    : 0

  // ── Absence breakdown by type ─────────────────────────────────────────────
  const absenceByType: AbsenceTypeEntry[] = [
    { type: 'Maladie',       days: totalSickDays,                           color: '#F87171' },
    { type: 'Congés payés',  days: buckets.reduce((s, b) => s + b.cpDays, 0),   color: '#60A5FA' },
    { type: 'RTT',           days: buckets.reduce((s, b) => s + b.rttDays, 0),  color: '#818CF8' },
    { type: 'Autres',        days: buckets.reduce((s, b) => s + b.otherDays, 0), color: '#FBBF24' },
  ].filter(t => t.days > 0)

  return NextResponse.json({
    periodLabel: `${periodStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} – ${periodEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    periodStart: startStr,
    periodEnd:   endStr,
    granularity: cfg.granularity,
    kpi: {
      totalLaborCost,
      totalPlannedHours,
      totalRealHours,
      avgPresenceRate,
      totalAbsenceDays,
      totalSickDays,
      totalLatenessCount,
      turnoverCount:    turnover.length,
      activeEmployees:  (employees ?? []).length,
      chronicCount:     employeeStats.filter(e => e.flags.length > 0).length,
    },
    buckets,
    employees: employeeStats,
    turnover,
    absenceByType,
  } satisfies AnalyticsPayload)
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
