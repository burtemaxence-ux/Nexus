'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type Profile, type Shift, type Poste, type LeaveRequest, type LeaveType } from '@/types'
import { getWeekLabel, toISODate, addDays } from '@/lib/utils/dates'

interface EmployeePlanningGridProps {
  weekDates: Date[]
  employee: Profile
  shifts: Shift[]
  postes: Poste[]
  leaveRequests: LeaveRequest[]
}

const LEAVE_STYLES: Record<LeaveType, { style: React.CSSProperties; label: string }> = {
  CP:         { label: 'Congés payés',  style: { backgroundColor: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--accent)' } },
  RTT:        { label: 'RTT',           style: { backgroundColor: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--accent)' } },
  maladie:    { label: 'Arrêt maladie', style: { backgroundColor: '#FEE2E2', borderColor: 'var(--danger)', color: 'var(--danger)' } },
  sans_solde: { label: 'Sans solde',    style: { backgroundColor: 'var(--bg-page)', borderColor: 'var(--border)', color: 'var(--text-secondary)' } },
  autre:      { label: 'Autre',         style: { backgroundColor: '#FEF3C7', borderColor: 'var(--warning)', color: 'var(--warning)' } },
}

function AbsenceBadge({ type }: { type: LeaveType }) {
  const s = LEAVE_STYLES[type]
  return (
    <div className="rounded border px-1.5 py-1 text-[10px] font-semibold flex items-center gap-1" style={s.style}>
      <span>🏖</span>
      <span>{s.label}</span>
    </div>
  )
}

function getDayLabel(date: Date): { weekday: string; dayMonth: string } {
  const weekday = date.toLocaleDateString('fr-FR', { weekday: 'short' })
  const dayMonth = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return {
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1).replace('.', ''),
    dayMonth,
  }
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
}

function formatTime(time: string): string { return time.slice(0, 5) }

function calcShiftHours(start: string, end: string, breakMinutes: number = 0): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let minutes = (eh * 60 + em) - (sh * 60 + sm)
  if (minutes < 0) minutes += 24 * 60
  minutes -= breakMinutes
  return Math.max(0, minutes) / 60
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export function EmployeePlanningGrid({ weekDates, employee, shifts, postes, leaveRequests }: EmployeePlanningGridProps) {
  const prevMonday = addDays(weekDates[0], -7)
  const nextMonday = addDays(weekDates[0], 7)

  const posteMap = new Map<string, Poste>()
  for (const poste of postes) posteMap.set(poste.id, poste)

  const prevWeekParam = toISODate(prevMonday)
  const nextWeekParam = toISODate(nextMonday)
  const weekLabel = getWeekLabel(weekDates)

  const shiftMap = new Map<string, Shift[]>()
  for (const shift of shifts) {
    const existing = shiftMap.get(shift.date) ?? []
    existing.push(shift)
    shiftMap.set(shift.date, existing)
  }

  const absenceMap = new Map<string, LeaveType>()
  for (const req of leaveRequests) {
    const start = new Date(req.start_date + 'T00:00:00')
    const end = new Date(req.end_date + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      absenceMap.set(toISODate(d), req.type)
    }
  }

  const totalHours = shifts.reduce(
    (sum, s) => sum + calcShiftHours(s.start_time, s.end_time, s.break_minutes),
    0
  )

  return (
    <div className="space-y-4">
      {/* Header navigation */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link href={`?week=${prevWeekParam}`}>
          <Button variant="outline" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Semaine précédente
          </Button>
        </Link>

        <h2 className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>{weekLabel}</h2>

        <Link href={`?week=${nextWeekParam}`}>
          <Button variant="outline" size="sm" className="gap-1">
            Semaine suivante
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Planning grid */}
      <div className="overflow-x-auto rounded-xl" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.06em] w-48 min-w-[180px]"
                style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)' }}>
                Semaine
              </th>
              {weekDates.map((date) => {
                const { weekday, dayMonth } = getDayLabel(date)
                const today = isToday(date)
                return (
                  <th
                    key={toISODate(date)}
                    className="px-3 py-3 text-center text-[13px] font-medium"
                    style={{
                      backgroundColor: today ? 'var(--accent-light)' : 'var(--bg-page)',
                      color: today ? 'var(--accent)' : 'var(--text-secondary)',
                      borderBottom: '0.5px solid var(--border)',
                      borderRight: '0.5px solid var(--border)',
                    }}
                  >
                    <div className="font-semibold">{weekday}</div>
                    <div className="text-[11px] font-normal mt-0.5" style={{ color: today ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                      {dayMonth}
                    </div>
                  </th>
                )
              })}
              <th className="px-3 py-3 text-center text-[11px] font-medium uppercase tracking-[0.06em] w-20"
                style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', borderBottom: '0.5px solid var(--border)' }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: 'var(--bg-card)' }}>
              <td className="px-4 py-3" style={{ borderRight: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)' }}>
                <div>
                  <p className="truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    {employee.full_name ?? employee.email}
                  </p>
                  {employee.position && (
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{employee.position}</p>
                  )}
                </div>
              </td>

              {weekDates.map((date) => {
                const dateStr = toISODate(date)
                const dayShifts = shiftMap.get(dateStr) ?? []
                const absenceType = absenceMap.get(dateStr)
                const today = isToday(date)

                return (
                  <td
                    key={dateStr}
                    className="px-2 py-2 align-top"
                    style={{
                      minHeight: '80px',
                      borderRight: '0.5px solid var(--border)',
                      borderBottom: '0.5px solid var(--border)',
                      backgroundColor: today ? 'var(--accent-light)' : undefined,
                      opacity: today ? 0.85 : 1,
                    }}
                  >
                    {dayShifts.length === 0 && !absenceType ? (
                      <div className="min-h-[80px] rounded-sm" style={{ backgroundColor: 'var(--bg-page)', border: '0.5px solid var(--border)' }} />
                    ) : (
                      <div className="min-h-[80px] space-y-1">
                        {absenceType && <AbsenceBadge type={absenceType} />}
                        {dayShifts.map((shift) => {
                          const poste = shift.poste_id ? posteMap.get(shift.poste_id) : null
                          const bgColor = poste ? `${poste.color}20` : 'var(--accent-light)'
                          const borderColor = poste?.color ?? 'var(--accent)'
                          const textColor = poste?.color ?? 'var(--accent)'
                          return (
                            <div
                              key={shift.id}
                              style={{ backgroundColor: bgColor, borderColor, color: textColor, border: `0.5px solid ${borderColor}` }}
                              className="rounded-md p-1.5 text-xs"
                            >
                              <p className="font-semibold">
                                {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                              </p>
                              <p className="truncate" style={{ color: textColor, opacity: 0.85 }}>
                                {shift.position ?? employee.position}
                              </p>
                              {shift.break_minutes > 0 && (
                                <p className="opacity-60 text-[10px]">pause {shift.break_minutes}min</p>
                              )}
                              {shift.notes && (
                                <p className="truncate mt-0.5 italic" style={{ color: textColor, opacity: 0.7 }}>
                                  {shift.notes}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </td>
                )
              })}

              <td className="px-3 py-3 text-center align-middle" style={{ borderBottom: '0.5px solid var(--border)' }}>
                <span className="text-[13px] font-semibold" style={{ color: totalHours > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {totalHours > 0 ? formatHours(totalHours) : '—'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
