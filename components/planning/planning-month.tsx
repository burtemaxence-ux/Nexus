'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShiftModal, type ModalState } from '@/components/planning/shift-modal'
import { toISODate } from '@/lib/utils/dates'
import type { Profile, Shift, Poste } from '@/types'

interface PlanningMonthProps {
  month: Date
  employees: Profile[]
  shifts: Shift[]
  postes: Poste[]
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function calcShiftMinutes(shift: Shift): number {
  const [sh, sm] = shift.start_time.split(':').map(Number)
  const [eh, em] = shift.end_time.split(':').map(Number)
  let minutes = (eh * 60 + em) - (sh * 60 + sm)
  if (minutes < 0) minutes += 24 * 60
  return Math.max(0, minutes - (shift.break_minutes ?? 0))
}

function formatMonthParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const WEEKDAY_ABBR = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function isToday(d: Date): boolean {
  const now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export function PlanningMonth({ month, employees, shifts, postes }: PlanningMonthProps) {
  const [modalState, setModalState] = useState<ModalState>({ type: 'closed' })

  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const days = getDaysInMonth(year, monthIndex)

  const posteMap = useMemo(() => {
    const m = new Map<string, Poste>()
    for (const p of postes) m.set(p.id, p)
    return m
  }, [postes])

  const shiftMap = useMemo(() => {
    const m = new Map<string, Shift>()
    for (const s of shifts) m.set(`${s.employee_id}__${s.date}`, s)
    return m
  }, [shifts])

  const monthlyMinutes = useMemo(() => {
    const totals = new Map<string, number>()
    for (const s of shifts) {
      totals.set(s.employee_id, (totals.get(s.employee_id) ?? 0) + calcShiftMinutes(s))
    }
    return totals
  }, [shifts])

  const prevMonth = new Date(year, monthIndex - 1, 1)
  const nextMonth = new Date(year, monthIndex + 1, 1)
  const monthLabel = month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  function formatMinutes(mins: number): string {
    if (mins === 0) return '—'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* View toggle */}
        <div className="flex overflow-hidden text-[13px] font-medium" style={{ border: '0.5px solid var(--border)', borderRadius: '8px' }}>
          <Link href="/manager/planning" className="px-4 py-2 transition-colors duration-150" style={{ color: 'var(--text-secondary)' }}>
            Semaine
          </Link>
          <div className="px-4 py-2 select-none" style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-card)', borderLeft: '0.5px solid var(--border)' }}>
            Mois
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/manager/planning?view=month&month=${formatMonthParam(prevMonth)}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-[13px] font-medium capitalize w-40 text-center" style={{ color: 'var(--text-primary)' }}>{monthLabel}</span>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/manager/planning?view=month&month=${formatMonthParam(nextMonth)}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {employees.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ border: '0.5px dashed var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <p className="mb-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>Ajoutez des employés pour commencer à planifier</p>
          <Link href="/manager/employees">
            <Button variant="outline" size="sm">Gérer les employés</Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <table className="border-collapse text-xs" style={{ minWidth: `${180 + days.length * 44 + 72}px` }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                <th className="sticky left-0 z-10 text-left px-4 py-3 text-[11px] font-medium uppercase tracking-[0.06em] w-44 min-w-[176px]"
                  style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', borderRight: '0.5px solid var(--border)' }}>
                  Employé
                </th>
                {days.map((day) => {
                  const weekend = day.getDay() === 0 || day.getDay() === 6
                  const today = isToday(day)
                  return (
                    <th
                      key={toISODate(day)}
                      className="py-2 px-0.5 text-center font-medium w-11"
                      style={{
                        backgroundColor: today ? 'var(--accent-light)' : 'var(--bg-page)',
                        color: today ? 'var(--accent)' : weekend ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                      }}
                    >
                      <div className="text-[10px]">{WEEKDAY_ABBR[day.getDay()]}</div>
                      <div className="text-xs font-bold">{day.getDate()}</div>
                    </th>
                  )
                })}
                <th className="px-3 py-3 text-right text-[11px] font-medium uppercase tracking-[0.06em] min-w-[72px]"
                  style={{ color: 'var(--text-secondary)', borderLeft: '0.5px solid var(--border)' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, rowIndex) => {
                const totalMins = monthlyMinutes.get(employee.id) ?? 0
                return (
                  <tr
                    key={employee.id}
                    style={{
                      borderBottom: '0.5px solid var(--border)',
                      backgroundColor: rowIndex % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-page)',
                    }}
                  >
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2" style={{ borderRight: '0.5px solid var(--border)' }}>
                      <p className="font-medium text-[13px] truncate max-w-[152px]" style={{ color: 'var(--text-primary)' }}>
                        {employee.full_name ?? employee.email}
                      </p>
                      {employee.position && (
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>{employee.position}</p>
                      )}
                    </td>

                    {days.map((day) => {
                      const dateStr = toISODate(day)
                      const shift = shiftMap.get(`${employee.id}__${dateStr}`)
                      const weekend = day.getDay() === 0 || day.getDay() === 6
                      const today = isToday(day)

                      return (
                        <td
                          key={dateStr}
                          onClick={() => {
                            if (shift) setModalState({ type: 'view', shift, employee, date: day })
                            else setModalState({ type: 'create', employee, date: day })
                          }}
                          className="p-0.5 align-top cursor-pointer transition-colors duration-150"
                          style={{
                            height: '52px',
                            verticalAlign: 'middle',
                            backgroundColor: today ? 'var(--accent-light)' : weekend ? 'var(--bg-page)' : undefined,
                            opacity: today ? 0.85 : 1,
                          }}
                        >
                          {shift ? (
                            <ShiftCell shift={shift} poste={shift.poste_id ? posteMap.get(shift.poste_id) : undefined} />
                          ) : (
                            <div className="h-full min-h-[44px]" />
                          )}
                        </td>
                      )
                    })}

                    <td className="px-3 py-2 text-right align-middle" style={{ borderLeft: '0.5px solid var(--border)' }}>
                      <span className="text-[13px] font-semibold" style={{ color: totalMins > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {formatMinutes(totalMins)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ShiftModal
        modalState={modalState}
        onClose={() => setModalState({ type: 'closed' })}
        postes={postes}
        employees={employees}
        weekDates={days}
      />
    </div>
  )
}

function ShiftCell({ shift, poste }: { shift: Shift; poste: Poste | undefined }) {
  const bg = poste?.color ?? 'var(--accent)'
  return (
    <div
      className="mx-0.5 rounded px-1 py-0.5 text-white leading-tight text-center hover:opacity-90 transition-opacity"
      style={{ backgroundColor: bg, minHeight: '44px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
    >
      <div className="font-semibold text-[10px]">{shift.start_time.slice(0, 5)}</div>
      <div className="text-[10px] opacity-85">{shift.end_time.slice(0, 5)}</div>
    </div>
  )
}
