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
  present:   { label: 'Présent',  bg: '#DCFCE7',             text: '#16A34A',               dot: '#16A34A'               },
  on_break:  { label: 'En pause', bg: '#FEF3C7',             text: '#D97706',               dot: '#D97706'               },
  departed:  { label: 'Parti',    bg: 'var(--bg-page)',      text: 'var(--text-secondary)', dot: 'var(--text-tertiary)'  },
  absent:    { label: 'Absent',   bg: '#FEE2E2',             text: '#DC2626',               dot: '#DC2626'               },
  scheduled: { label: 'Attendu',  bg: 'var(--accent-light)', text: 'var(--accent)',         dot: 'var(--accent)'         },
  no_data:   { label: '—',        bg: 'var(--bg-page)',      text: 'var(--text-tertiary)',  dot: 'var(--border)'         },
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
    <div className="px-6 py-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
            Badgeuse
          </h1>
          <p className="text-[13px] mt-1 capitalize" style={{ color: 'var(--text-tertiary)' }}>{todayLabel}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {period === 'today' && (
            <div className="flex items-center gap-1.5 text-[12px] rounded-[6px] px-3 py-1.5"
              style={{ color: 'var(--success)', backgroundColor: '#DCFCE7', border: '0.5px solid var(--success)' }}>
              <Wifi className="h-3 w-3" />
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--success)' }} />
              Temps réel
            </div>
          )}
          {/* Period toggle */}
          <div className="flex overflow-hidden text-[13px]"
            style={{ border: '0.5px solid var(--border)', borderRadius: '8px' }}>
            {(['today', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1.5 transition-colors duration-150"
                style={{
                  backgroundColor: period === p ? 'var(--text-primary)' : 'transparent',
                  color: period === p ? 'var(--bg-card)' : 'var(--text-tertiary)',
                  borderLeft: p !== 'today' ? '0.5px solid var(--border)' : undefined,
                }}
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
            { key: 'present'  as const, icon: LogIn,  label: 'En service', color: '#16A34A', bg: '#DCFCE7' },
            { key: 'on_break' as const, icon: Coffee, label: 'En pause',   color: '#D97706', bg: '#FEF3C7' },
            { key: 'departed' as const, icon: LogOut, label: 'Partis',     color: 'var(--text-secondary)', bg: 'var(--bg-page)' },
            { key: 'absent'   as const, icon: Users,  label: 'Absents',    color: '#DC2626', bg: '#FEE2E2' },
          ]).map(({ key, icon: Icon, label, color, bg }) => (
            <div key={key} className="rounded-[10px] p-3 text-center" style={{ backgroundColor: bg, border: '0.5px solid var(--border)' }}>
              <Icon className="h-3.5 w-3.5 mx-auto mb-2" style={{ color }} />
              <p className="text-[20px] font-[400] leading-none" style={{ color }}>{counts[key]}</p>
              <p className="text-[10px] uppercase tracking-[0.06em] mt-2" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
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
        <div className="rounded-xl p-12 text-center" style={{ border: '0.5px dashed var(--border)' }}>
          <CalendarDays className="h-8 w-8 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {employees.length === 0 ? 'Aucun employé' : 'Aucune donnée pour cette période'}
          </p>
          {employees.length > 0 && (
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Aucun créneau planifié ni pointage enregistré.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                {period !== 'today' && (
                  <th className="text-left px-4 py-3 whitespace-nowrap" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
                    Date
                  </th>
                )}
                <th className="text-left px-4 py-3" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Employé</th>
                <th className="text-left px-4 py-3 whitespace-nowrap" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Planifié</th>
                <th className="text-left px-4 py-3" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Arrivée</th>
                <th className="text-left px-4 py-3" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Départ</th>
                {period === 'today' && (
                  <th className="text-left px-4 py-3" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Durée</span>
                  </th>
                )}
                <th className="text-left px-4 py-3" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
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

  const rowStyle = status === 'absent' ? { backgroundColor: 'rgba(254,226,226,0.15)' } : {}

  return (
    <tr style={{ borderBottom: '0.5px solid var(--border)', ...rowStyle }}>

      {showDate && (
        <td className="px-4 py-3 text-[12px] whitespace-nowrap capitalize" style={{ color: 'var(--text-secondary)' }}>
          {formatDate(date)}
        </td>
      )}

      {/* Employé */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-medium"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
            {getInitials(employee.full_name, employee.email)}
          </div>
          <div>
            <p className="text-[13px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
              {employee.full_name ?? employee.email}
            </p>
            {employee.position && (
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{employee.position}</p>
            )}
          </div>
        </div>
      </td>

      {/* Planifié */}
      <td className="px-4 py-3 tabular-nums text-[12px]" style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
        {shift ? `${shift.start_time.slice(0, 5)} – ${shift.end_time.slice(0, 5)}` : '—'}
      </td>

      {/* Arrivée */}
      <td className="px-4 py-3 tabular-nums text-[13px]" style={{ color: presence?.clock_in ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
        {presence?.clock_in ? formatTime(presence.clock_in) : '—'}
      </td>

      {/* Départ */}
      <td className="px-4 py-3 tabular-nums text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        {presence?.clock_out ? formatTime(presence.clock_out) : '—'}
      </td>

      {/* Durée (today only) */}
      {showDuration && (
        <td className="px-4 py-3 tabular-nums text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {worked > 0 ? formatDuration(worked) : '—'}
        </td>
      )}

      {/* Statut */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {status !== 'no_data' && (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap"
              style={{ backgroundColor: cfg.bg, color: cfg.text, padding: '3px 8px', borderRadius: '6px', border: '0.5px solid transparent' }}
            >
              {(status === 'present' || status === 'on_break') ? (
                <span className={`dp-status-dot ${status === 'present' ? 'active' : 'warning'}`} style={{ width: '6px', height: '6px' }} />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
              )}
              {cfg.label}
            </span>
          )}
          {isLate && (
            <span className="dp-badge-warning whitespace-nowrap">En retard {late_minutes} min</span>
          )}
          {isOnTime && (
            <span className="dp-badge-success whitespace-nowrap">À l&apos;heure</span>
          )}
        </div>
      </td>
    </tr>
  )
}
