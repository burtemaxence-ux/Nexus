'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wifi, Users, LogIn, LogOut, Coffee, CalendarDays } from 'lucide-react'

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
  needs_review?: boolean
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

// Progression dans le shift (0–100) selon l'heure courante.
function shiftPctNow(shift: ShiftRow | null, now: Date): number {
  if (!shift) return 0
  const [sh, sm] = shift.start_time.split(':').map(Number)
  const [eh, em] = shift.end_time.split(':').map(Number)
  const start = sh * 60 + sm
  let end = eh * 60 + em
  if (end <= start) end += 24 * 60
  const cur = now.getHours() * 60 + now.getMinutes()
  if (cur <= start) return 0
  if (cur >= end) return 100
  return Math.round(((cur - start) / (end - start)) * 100)
}

// ── Status config (thème sombre, tokens) ───────────────────────────────────────

const STATUS_CFG: Record<RowStatus, { label: string; bg: string; text: string; dot: string }> = {
  present:   { label: 'En service', bg: 'rgba(0,212,170,0.12)',  text: 'var(--success)',        dot: 'var(--success)'       },
  on_break:  { label: 'En pause',   bg: 'rgba(255,179,71,0.12)', text: 'var(--warning)',        dot: 'var(--warning)'       },
  departed:  { label: 'Parti',      bg: 'var(--bg-input)',       text: 'var(--text-secondary)', dot: 'var(--text-tertiary)' },
  absent:    { label: 'Absent',     bg: 'rgba(255,107,107,0.12)',text: 'var(--danger)',         dot: 'var(--danger)'        },
  scheduled: { label: 'Attendu',    bg: 'var(--accent-light)',   text: 'var(--accent)',         dot: 'var(--accent)'        },
  no_data:   { label: '—',          bg: 'transparent',           text: 'var(--text-tertiary)',  dot: 'var(--border)'        },
}

const STATUS_ORDER: Record<RowStatus, number> = {
  present: 0, on_break: 1, scheduled: 2, absent: 3, departed: 4, no_data: 5,
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
      result.sort((a, b) =>
        (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) ||
        (b.late_minutes - a.late_minutes) ||
        (a.employee.full_name ?? '').localeCompare(b.employee.full_name ?? '')
      )
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
    <div className="px-4 py-4 md:px-6 md:py-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-primary)' }}>
            Présences
          </h1>
          <p className="text-[13px] mt-1 capitalize" style={{ color: 'var(--text-tertiary)' }}>{todayLabel}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {period === 'today' && (
            <div className="flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3 py-1.5"
              style={{ color: 'var(--success)', backgroundColor: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)' }}>
              <Wifi className="h-3 w-3" />
              <span className="h-1.5 w-1.5 rounded-full dot-pulse-green" style={{ backgroundColor: 'var(--success)' }} />
              Temps réel
            </div>
          )}
          {/* Period toggle */}
          <div className="flex overflow-hidden text-[13px]"
            style={{ border: '1px solid var(--border)', borderRadius: '9px' }}>
            {(['today', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3.5 py-1.5 font-medium transition-colors duration-150"
                style={{
                  backgroundColor: period === p ? 'var(--text-primary)' : 'transparent',
                  color: period === p ? 'var(--bg-card)' : 'var(--text-tertiary)',
                  borderLeft: p !== 'today' ? '1px solid var(--border)' : undefined,
                }}
              >
                {p === 'today' ? "Aujourd'hui" : p === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats (today only) */}
      {period === 'today' && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {([
            { key: 'present'  as const, icon: LogIn,  label: 'En service', color: 'var(--success)', bg: 'rgba(0,212,170,0.1)' },
            { key: 'on_break' as const, icon: Coffee, label: 'En pause',   color: 'var(--warning)', bg: 'rgba(255,179,71,0.1)' },
            { key: 'departed' as const, icon: LogOut, label: 'Partis',     color: 'var(--text-secondary)', bg: 'var(--bg-input)' },
            { key: 'absent'   as const, icon: Users,  label: 'Absents',    color: 'var(--danger)', bg: 'rgba(255,107,107,0.1)' },
          ]).map(({ key, icon: Icon, label, color, bg }, i) => (
            <div
              key={key}
              className="pres-reveal rounded-[14px] p-4"
              style={{ animationDelay: `${i * 50}ms`, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="w-8 h-8 rounded-[9px] flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <p className="text-[28px] font-bold leading-none tabular-nums" style={{ fontFamily: 'var(--font-manrope)', color }}>{counts[key]}</p>
              <p className="text-[10px] uppercase tracking-[0.06em] mt-2" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[16px] p-12 text-center" style={{ border: '1px dashed var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <CalendarDays className="h-9 w-9 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {employees.length === 0 ? 'Aucun employé' : 'Aucune donnée pour cette période'}
          </p>
          {employees.length > 0 && (
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Aucun créneau planifié ni pointage enregistré.
            </p>
          )}
        </div>
      ) : period === 'today' ? (
        /* ── AUJOURD'HUI : cartes live ── */
        <div className="space-y-2.5">
          {rows.map((row, i) => (
            <PresenceCard key={row.key} row={row} now={now} index={i} />
          ))}
        </div>
      ) : (
        /* ── SEMAINE / MOIS : table ── */
        <div className="rounded-[16px] overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-input)' }}>
                  <th className="text-left px-4 py-3 whitespace-nowrap" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Date</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Employé</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Planifié</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Arrivée</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Départ</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <PresenceTableRow key={row.key} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Carte live (aujourd'hui) ────────────────────────────────────────────────────

function PresenceCard({ row, now, index }: { row: TableRow; now: Date; index: number }) {
  const { employee, shift, presence, status, late_minutes } = row
  const cfg = STATUS_CFG[status]
  const worked = workedMinutes(presence)
  const isLate = late_minutes > 0
  const isOnTime = !isLate && !!presence?.clock_in && !!shift
  const live = status === 'present' || status === 'on_break'
  const pct = live ? shiftPctNow(shift, now) : status === 'departed' ? 100 : 0
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="pres-reveal rounded-[14px] p-4"
      style={{
        animationDelay: `${index * 45}ms`,
        backgroundColor: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--border-hover)' : 'var(--border)'}`,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 24px rgba(16,24,40,0.12)' : 'none',
        transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
        opacity: status === 'absent' ? 0.92 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-3">
        {/* Avatar + pastille live */}
        <div className="relative flex-shrink-0">
          <div className="h-11 w-11 rounded-full flex items-center justify-center text-[12px] font-semibold"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', fontFamily: 'var(--font-manrope)' }}>
            {getInitials(employee.full_name, employee.email)}
          </div>
          {live && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ${status === 'present' ? 'dot-pulse-green' : 'dot-pulse-yellow'}`}
              style={{ backgroundColor: cfg.dot, border: '2px solid var(--bg-card)' }}
            />
          )}
        </div>

        {/* Nom + poste */}
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
            {employee.full_name ?? employee.email}
          </p>
          {employee.position && (
            <p className="text-[12px] truncate" style={{ color: 'var(--text-tertiary)' }}>{employee.position}</p>
          )}
        </div>

        {/* Statut + badges */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end flex-shrink-0">
          {isLate && <span className="dp-badge-warning whitespace-nowrap">+{late_minutes} min</span>}
          {isOnTime && live && <span className="dp-badge-success whitespace-nowrap">À l&apos;heure</span>}
          {presence?.needs_review && (
            <span className="dp-badge-warning whitespace-nowrap" title="Durée anormale (oubli de pointage probable)">⚠ Vérifier</span>
          )}
          {status !== 'no_data' && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap rounded-full"
              style={{ backgroundColor: cfg.bg, color: cfg.text, padding: '4px 10px' }}>
              {cfg.label}
            </span>
          )}
        </div>
      </div>

      {/* Détails temps */}
      <div className="grid grid-cols-3 gap-2 mt-3.5">
        <Mini label="Planifié" value={shift ? `${shift.start_time.slice(0, 5)}–${shift.end_time.slice(0, 5)}` : '—'} />
        <Mini
          label="Arrivée"
          value={presence?.clock_in ? formatTime(presence.clock_in) : '—'}
          color={isLate ? 'var(--warning)' : presence?.clock_in ? 'var(--text-primary)' : 'var(--text-tertiary)'}
        />
        <Mini
          label={status === 'departed' ? 'Travaillé' : live ? 'En cours' : 'Durée'}
          value={worked > 0 ? formatDuration(worked) : '—'}
          color={live ? 'var(--success)' : 'var(--text-primary)'}
        />
      </div>

      {/* Barre de progression du shift (live) */}
      {live && shift && (
        <div className="mt-3 w-full rounded-full overflow-hidden" style={{ height: '4px', backgroundColor: 'var(--border)' }}>
          <div className="h-full rounded-full bar-grow-right" style={{ width: `${pct}%`, backgroundColor: cfg.dot, transition: 'width 700ms ease' }} />
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, color = 'var(--text-primary)' }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="rounded-[10px] px-2.5 py-2"
      style={{ backgroundColor: 'var(--bg-input)' }}
    >
      <p className="text-[9px] uppercase tracking-[0.06em] mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="text-[13px] font-semibold tabular-nums leading-none" style={{ color, fontFamily: 'var(--font-manrope)' }}>{value}</p>
    </div>
  )
}

// ── Ligne de table (semaine / mois) ─────────────────────────────────────────────

function PresenceTableRow({ row }: { row: TableRow }) {
  const { employee, date, shift, presence, status, late_minutes } = row
  const cfg = STATUS_CFG[status]
  const isLate = late_minutes > 0
  const isOnTime = !isLate && !!presence?.clock_in && !!shift

  return (
    <tr
      className="transition-colors duration-150 hover:bg-[var(--bg-input)]"
      style={{ borderBottom: '1px solid var(--border)', ...(status === 'absent' ? { backgroundColor: 'rgba(255,107,107,0.05)' } : {}) }}
    >
      <td className="px-4 py-3 text-[12px] whitespace-nowrap capitalize" style={{ color: 'var(--text-secondary)' }}>
        {formatDate(date)}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-medium"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
            {getInitials(employee.full_name, employee.email)}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
              {employee.full_name ?? employee.email}
            </p>
            {employee.position && (
              <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{employee.position}</p>
            )}
          </div>
        </div>
      </td>

      <td className="px-4 py-3 tabular-nums text-[12px]" style={{ color: 'var(--text-secondary)' }}>
        {shift ? `${shift.start_time.slice(0, 5)} – ${shift.end_time.slice(0, 5)}` : '—'}
      </td>

      <td className="px-4 py-3 tabular-nums text-[13px]" style={{ color: presence?.clock_in ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
        {presence?.clock_in ? formatTime(presence.clock_in) : '—'}
      </td>

      <td className="px-4 py-3 tabular-nums text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        {presence?.clock_out ? formatTime(presence.clock_out) : '—'}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {status !== 'no_data' && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap rounded-full"
              style={{ backgroundColor: cfg.bg, color: cfg.text, padding: '3px 9px' }}>
              <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
              {cfg.label}
            </span>
          )}
          {isLate && <span className="dp-badge-warning whitespace-nowrap">En retard {late_minutes} min</span>}
          {isOnTime && <span className="dp-badge-success whitespace-nowrap">À l&apos;heure</span>}
          {presence?.needs_review && (
            <span className="dp-badge-warning whitespace-nowrap" title="Durée anormale (oubli de pointage probable) — à corriger">⚠ À vérifier</span>
          )}
        </div>
      </td>
    </tr>
  )
}
