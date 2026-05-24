'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wifi, Users, LogIn, LogOut, Coffee, Clock, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month'

type Employee = {
  id: string
  full_name: string | null
  email: string | null
  position: string | null
}

type PresenceRow = {
  id: string
  employee_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  break_start: string | null
  break_end: string | null
  break_minutes_used: number
}

type ShiftRow = {
  id: string
  employee_id: string
  date: string
  start_time: string
  end_time: string
}

type RowStatus = 'scheduled' | 'present' | 'on_break' | 'departed' | 'absent' | 'no_data'

type TableRow = {
  key: string
  employee: Employee
  date: string
  shift: ShiftRow | null
  presence: PresenceRow | null
  status: RowStatus
  late_minutes: number
  is_today: boolean
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function getWeekRange(): { from: string; to: string } {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) }
}

function getMonthRange(): { from: string; to: string } {
  const d = new Date()
  return {
    from: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10),
    to: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10),
  }
}

function getDateRange(period: Period): { from: string; to: string } {
  if (period === 'today') return { from: getToday(), to: getToday() }
  if (period === 'week') return getWeekRange()
  return getMonthRange()
}

function buildDateList(from: string, to: string): string[] {
  const dates: string[] = []
  const cur = new Date(from + 'T12:00:00')
  const end = new Date(to + 'T12:00:00')
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function getInitials(name: string | null, email: string | null): string {
  const s = name ?? email ?? '?'
  return s.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

// ── Business logic ────────────────────────────────────────────────────────────

function findClosestShift(shiftList: ShiftRow[], date: string, clockIn: string | null): ShiftRow | null {
  if (shiftList.length === 0) return null
  if (shiftList.length === 1) return shiftList[0]
  const sorted = [...shiftList].sort((a, b) => a.start_time.localeCompare(b.start_time))
  if (!clockIn) return sorted[0]
  const clockInMs = new Date(clockIn).getTime()
  return sorted.reduce((best, s) => {
    const sMs = new Date(`${date}T${s.start_time}`).getTime()
    const bMs = new Date(`${date}T${best.start_time}`).getTime()
    return Math.abs(sMs - clockInMs) < Math.abs(bMs - clockInMs) ? s : best
  })
}

function computeRow(
  date: string,
  shift: ShiftRow | null,
  presence: PresenceRow | null,
): { status: RowStatus; late_minutes: number } {
  const today = getToday()
  const now = new Date()
  let late_minutes = 0

  if (shift && presence?.clock_in) {
    const shiftStart = new Date(`${date}T${shift.start_time}`)
    const clockIn = new Date(presence.clock_in)
    late_minutes = Math.max(0, Math.floor((clockIn.getTime() - shiftStart.getTime()) / 60000))
  }

  if (!presence?.clock_in) {
    if (!shift) return { status: 'no_data', late_minutes: 0 }
    if (date === today) {
      const shiftStart = new Date(`${date}T${shift.start_time}`)
      if (shiftStart > now) return { status: 'scheduled', late_minutes: 0 }
    }
    return { status: 'absent', late_minutes: 0 }
  }

  if (presence.clock_out) return { status: 'departed', late_minutes }
  if (presence.break_start && !presence.break_end) return { status: 'on_break', late_minutes }
  return { status: 'present', late_minutes }
}

function workedMinutes(p: PresenceRow | null): number {
  if (!p?.clock_in) return 0
  const end = p.clock_out ? new Date(p.clock_out) : new Date()
  const total = Math.floor((end.getTime() - new Date(p.clock_in).getTime()) / 60000)
  return Math.max(0, total - (p.break_minutes_used ?? 0))
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<RowStatus, { label: string; bg: string; text: string; dot: string }> = {
  present:   { label: 'Présent',  bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  on_break:  { label: 'En pause', bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  departed:  { label: 'Parti',    bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400'    },
  absent:    { label: 'Absent',   bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500'     },
  scheduled: { label: 'Attendu',  bg: 'bg-blue-50',     text: 'text-blue-600',    dot: 'bg-blue-300'    },
  no_data:   { label: '—',        bg: 'bg-gray-50',     text: 'text-gray-400',    dot: 'bg-gray-200'    },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PresencesDashboardPage() {
  const [period, setPeriod] = useState<Period>('today')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [presences, setPresences] = useState<PresenceRow[]>([])
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  const fetchData = useCallback(async (p: Period) => {
    const { from, to } = getDateRange(p)
    const [empRes, presRes, shiftsRes] = await Promise.all([
      fetch('/api/employees'),
      fetch(`/api/presences?from=${from}&to=${to}`),
      fetch(`/api/shifts?from=${from}&to=${to}`),
    ])
    if (empRes.ok) setEmployees(await empRes.json())
    if (presRes.ok) {
      const d = await presRes.json()
      setPresences(Array.isArray(d) ? d : d ? [d] : [])
    }
    if (shiftsRes.ok) setShifts(await shiftsRes.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData(period)

    if (period !== 'today') return

    const supabase = createClient()
    const channel = supabase
      .channel('presences-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presences' }, () => fetchData(period))
      .subscribe()

    const tick = setInterval(() => setNow(new Date()), 30000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(tick)
    }
  }, [fetchData, period])

  const rows = useMemo<TableRow[]>(() => {
    const today = getToday()
    const { from, to } = getDateRange(period)

    const presenceMap = new Map<string, PresenceRow>()
    presences.forEach(p => presenceMap.set(`${p.employee_id}:${p.date}`, p))

    const shiftsByKey = new Map<string, ShiftRow[]>()
    shifts.forEach(s => {
      const k = `${s.employee_id}:${s.date}`
      if (!shiftsByKey.has(k)) shiftsByKey.set(k, [])
      shiftsByKey.get(k)!.push(s)
    })

    const result: TableRow[] = []

    if (period === 'today') {
      for (const emp of employees) {
        const presence = presenceMap.get(`${emp.id}:${today}`) ?? null
        const empShifts = shiftsByKey.get(`${emp.id}:${today}`) ?? []
        const shift = findClosestShift(empShifts, today, presence?.clock_in ?? null)
        const { status, late_minutes } = computeRow(today, shift, presence)
        result.push({ key: `${emp.id}:${today}`, employee: emp, date: today, shift, presence, status, late_minutes, is_today: true })
      }
    } else {
      for (const date of buildDateList(from, to)) {
        for (const emp of employees) {
          const presence = presenceMap.get(`${emp.id}:${date}`) ?? null
          const empShifts = shiftsByKey.get(`${emp.id}:${date}`) ?? []
          if (empShifts.length === 0 && !presence) continue
          const shift = findClosestShift(empShifts, date, presence?.clock_in ?? null)
          const { status, late_minutes } = computeRow(date, shift, presence)
          result.push({ key: `${emp.id}:${date}`, employee: emp, date, shift, presence, status, late_minutes, is_today: date === today })
        }
      }
    }

    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, presences, shifts, period, now])

  const counts = {
    present:  rows.filter(r => r.status === 'present').length,
    on_break: rows.filter(r => r.status === 'on_break').length,
    departed: rows.filter(r => r.status === 'departed').length,
    absent:   rows.filter(r => r.status === 'absent').length,
  }

  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Badgeuse</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {period === 'today' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
              <Wifi className="h-3 w-3" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Temps réel
            </div>
          )}
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            {(['today', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-4 py-1.5 font-medium transition-colors',
                  period === p
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {p === 'today' ? "Aujourd'hui" : p === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats (today only) */}
      {period === 'today' && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {([
            { key: 'present',  icon: LogIn,  label: 'En service', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
            { key: 'on_break', icon: Coffee, label: 'En pause',   color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200'   },
            { key: 'departed', icon: LogOut, label: 'Partis',     color: 'text-gray-600',    bg: 'bg-gray-50 border-gray-200'     },
            { key: 'absent',   icon: Users,  label: 'Absents',    color: 'text-red-500',     bg: 'bg-red-50 border-red-200'       },
          ] as const).map(({ key, icon: Icon, label, color, bg }) => (
            <div key={key} className={`rounded-xl border p-4 text-center ${bg}`}>
              <Icon className={`h-4 w-4 mx-auto mb-2 ${color}`} />
              <p className={`text-2xl font-bold ${color}`}>{counts[key]}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {employees.length === 0 ? 'Aucun employé' : 'Aucune donnée pour cette période'}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {employees.length > 0 && 'Aucun créneau planifié ni pointage enregistré.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {period !== 'today' && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    Date
                  </th>
                )}
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employé</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Planifié</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Arrivée</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Départ</th>
                {period === 'today' && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Durée</span>
                  </th>
                )}
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map(row => (
                <PresenceTableRow
                  key={row.key}
                  row={row}
                  showDate={period !== 'today'}
                  showDuration={period === 'today'}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Row component ─────────────────────────────────────────────────────────────

function PresenceTableRow({
  row,
  showDate,
  showDuration,
}: {
  row: TableRow
  showDate: boolean
  showDuration: boolean
}) {
  const { employee, date, shift, presence, status, late_minutes } = row
  const cfg = STATUS_CFG[status]
  const worked = showDuration ? workedMinutes(presence) : 0
  const isLate = late_minutes > 0
  const isOnTime = !isLate && !!presence?.clock_in && !!shift

  return (
    <tr className={cn(
      'transition-colors hover:bg-muted/20',
      status === 'absent' && 'bg-red-50/20',
    )}>

      {showDate && (
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap capitalize">
          {formatDate(date)}
        </td>
      )}

      {/* Employé */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-primary">
            {getInitials(employee.full_name, employee.email)}
          </div>
          <div>
            <p className="font-medium text-foreground leading-tight">{employee.full_name ?? employee.email}</p>
            {employee.position && <p className="text-[11px] text-muted-foreground">{employee.position}</p>}
          </div>
        </div>
      </td>

      {/* Planifié */}
      <td className="px-4 py-3 text-muted-foreground">
        {shift
          ? <span className="font-mono text-xs">{shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)}</span>
          : <span>—</span>}
      </td>

      {/* Arrivée */}
      <td className="px-4 py-3 tabular-nums">
        {presence?.clock_in
          ? <span className="font-medium text-foreground">{formatTime(presence.clock_in)}</span>
          : <span className="text-muted-foreground">—</span>}
      </td>

      {/* Départ */}
      <td className="px-4 py-3 tabular-nums text-muted-foreground">
        {presence?.clock_out ? formatTime(presence.clock_out) : '—'}
      </td>

      {/* Durée (today only) */}
      {showDuration && (
        <td className="px-4 py-3 tabular-nums text-muted-foreground text-sm">
          {worked > 0 ? formatDuration(worked) : '—'}
        </td>
      )}

      {/* Statut */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {status !== 'no_data' && (
            <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', cfg.bg, cfg.text)}>
              <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', cfg.dot)} />
              {cfg.label}
            </span>
          )}
          {isLate && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 whitespace-nowrap">
              En retard {late_minutes} min
            </span>
          )}
          {isOnTime && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 whitespace-nowrap">
              À l&apos;heure
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}
