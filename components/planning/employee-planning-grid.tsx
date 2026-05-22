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

const LEAVE_STYLES: Record<LeaveType, { bg: string; border: string; text: string; label: string }> = {
  CP:         { bg: 'bg-blue-50',   border: 'border-blue-300',  text: 'text-blue-700',  label: 'Congés payés' },
  RTT:        { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', label: 'RTT' },
  maladie:    { bg: 'bg-red-50',    border: 'border-red-300',   text: 'text-red-700',   label: 'Arrêt maladie' },
  sans_solde: { bg: 'bg-gray-100',  border: 'border-gray-300',  text: 'text-gray-600',  label: 'Sans solde' },
  autre:      { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', label: 'Autre' },
}

function AbsenceBadge({ type }: { type: LeaveType }) {
  const s = LEAVE_STYLES[type]
  return (
    <div className={`rounded border px-1.5 py-1 text-[10px] font-semibold ${s.bg} ${s.border} ${s.text} flex items-center gap-1`}>
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
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

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

  // Build poste lookup map
  const posteMap = new Map<string, Poste>()
  for (const poste of postes) {
    posteMap.set(poste.id, poste)
  }

  const prevWeekParam = toISODate(prevMonday)
  const nextWeekParam = toISODate(nextMonday)

  const weekLabel = getWeekLabel(weekDates)

  // Index shifts by date for fast lookup
  const shiftMap = new Map<string, Shift[]>()
  for (const shift of shifts) {
    const existing = shiftMap.get(shift.date) ?? []
    existing.push(shift)
    shiftMap.set(shift.date, existing)
  }

  // Expand approved leave requests to individual dates
  const absenceMap = new Map<string, LeaveType>()
  for (const req of leaveRequests) {
    const start = new Date(req.start_date + 'T00:00:00')
    const end = new Date(req.end_date + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      absenceMap.set(toISODate(d), req.type)
    }
  }

  // Total hours for the week (net, after break deduction)
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

        <h2 className="text-lg font-semibold text-gray-900">{weekLabel}</h2>

        <Link href={`?week=${nextWeekParam}`}>
          <Button variant="outline" size="sm" className="gap-1">
            Semaine suivante
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Planning grid */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr>
              {/* Employee column header */}
              <th className="border-b border-r border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-600 w-48 min-w-[180px]">
                Semaine
              </th>
              {/* Day headers */}
              {weekDates.map((date) => {
                const { weekday, dayMonth } = getDayLabel(date)
                const today = isToday(date)
                return (
                  <th
                    key={toISODate(date)}
                    className={`border-b border-r border-gray-200 px-3 py-3 text-center text-sm font-medium ${
                      today ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div className="font-semibold">{weekday}</div>
                    <div className={`text-xs font-normal mt-0.5 ${today ? 'text-blue-500' : 'text-gray-400'}`}>
                      {dayMonth}
                    </div>
                  </th>
                )
              })}
              {/* Total column header */}
              <th className="border-b border-gray-200 bg-gray-50 px-3 py-3 text-center text-sm font-medium text-gray-600 w-20">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white">
              {/* Employee info cell */}
              <td className="border-b border-r border-gray-200 px-4 py-3">
                <div>
                  <p className="truncate text-sm font-medium text-gray-900">
                    {employee.full_name ?? employee.email}
                  </p>
                  {employee.position && (
                    <p className="text-xs text-gray-500 mt-0.5">{employee.position}</p>
                  )}
                </div>
              </td>

              {/* Day cells */}
              {weekDates.map((date) => {
                const dateStr = toISODate(date)
                const dayShifts = shiftMap.get(dateStr) ?? []
                const absenceType = absenceMap.get(dateStr)
                const today = isToday(date)

                return (
                  <td
                    key={dateStr}
                    className={`border-b border-r border-gray-200 px-2 py-2 align-top ${
                      today ? 'bg-blue-50/30' : ''
                    }`}
                    style={{ minHeight: '80px' }}
                  >
                    {dayShifts.length === 0 && !absenceType ? (
                      <div className="min-h-[80px] bg-gray-100 rounded-sm border border-gray-200" />
                    ) : (
                      <div className="min-h-[80px] space-y-1">
                        {absenceType && <AbsenceBadge type={absenceType} />}
                        {dayShifts.map((shift) => {
                          const poste = shift.poste_id ? posteMap.get(shift.poste_id) : null
                          const bgColor = poste ? `${poste.color}20` : '#EFF6FF'
                          const borderColor = poste?.color ?? '#BFDBFE'
                          const textColor = poste?.color ?? '#1D4ED8'
                          return (
                          <div
                            key={shift.id}
                            style={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor }}
                            className="rounded-md border p-1.5 text-xs"
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

              {/* Weekly total cell */}
              <td className="border-b border-gray-200 px-3 py-3 text-center align-middle">
                <span className={`text-sm font-semibold ${totalHours > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
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
