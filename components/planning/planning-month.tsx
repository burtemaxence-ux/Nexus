'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from 'lucide-react'
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

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const WEEKDAY_ABBR = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function isToday(d: Date): boolean {
  const now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function formatMinutes(mins: number): string {
  if (mins === 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
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

  return (
    <div className="space-y-4">

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>

        {/* Left: nav + month label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href={`/manager/planning?view=month&month=${formatMonthParam(prevMonth)}`}>
            <button className="btn-secondary" style={{ padding: '7px 9px' }} aria-label="Mois précédent">
              <ChevronLeft size={14} />
            </button>
          </Link>
          <Link href={`/manager/planning?view=month&month=${formatMonthParam(new Date())}`}>
            <button className="btn-secondary" style={{ fontSize: '13px', padding: '7px 12px' }}>{"Aujourd'hui"}</button>
          </Link>
          <Calendar size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{monthLabel}</span>
            <ChevronDown size={13} style={{ color: 'var(--text-tertiary)' }} />
          </div>
        </div>

        {/* Center: Jour / Semaine / Mois pills */}
        <div style={{ display: 'flex', border: '0.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden', fontSize: '13px' }}>
          <Link href={`/manager/planning?view=day&date=${toISODate(new Date())}`}>
            <div style={{ padding: '6px 14px', color: 'var(--text-tertiary)', cursor: 'pointer', transition: 'color 150ms' }}
              className="hover:text-[var(--text-primary)]">Jour</div>
          </Link>
          <Link href="/manager/planning">
            <div style={{ padding: '6px 14px', color: 'var(--text-tertiary)', cursor: 'pointer', borderLeft: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', transition: 'color 150ms' }}
              className="hover:text-[var(--text-primary)]">Semaine</div>
          </Link>
          <div style={{ padding: '6px 14px', backgroundColor: 'var(--accent)', color: '#FFFFFF', userSelect: 'none' }}>
            Mois
          </div>
        </div>

        {/* Right: next */}
        <Link href={`/manager/planning?view=month&month=${formatMonthParam(nextMonth)}`}>
          <button className="btn-secondary" style={{ padding: '7px 9px' }} aria-label="Mois suivant">
            <ChevronRight size={14} />
          </button>
        </Link>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────────── */}
      {employees.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ border: '0.5px dashed var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <p className="mb-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>Ajoutez des employés pour commencer à planifier</p>
          <Link href="/manager/employees">
            <button className="btn-secondary">Gérer les employés</button>
          </Link>
        </div>
      ) : (
        /* ── Month grid ─────────────────────────────────────────────────────── */
        <div style={{
          borderRadius: '12px',
          border: '0.5px solid var(--border)',
          backgroundColor: 'var(--bg-card)',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: `${220 + days.length * 44 + 72}px`, width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                  {/* Employee header */}
                  <th style={{
                    position: 'sticky', left: 0, zIndex: 10,
                    backgroundColor: 'var(--bg-page)',
                    borderRight: '0.5px solid var(--border)',
                    padding: '12px 16px',
                    textAlign: 'left', width: '220px', minWidth: '200px',
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
                      Employé
                    </span>
                  </th>

                  {days.map((day) => {
                    const weekend = day.getDay() === 0 || day.getDay() === 6
                    const today = isToday(day)
                    return (
                      <th
                        key={toISODate(day)}
                        style={{
                          padding: '8px 2px',
                          textAlign: 'center',
                          width: '44px',
                          backgroundColor: 'var(--bg-page)',
                          borderRight: weekend ? '0.5px solid var(--border)' : undefined,
                        }}
                      >
                        <div style={{ fontSize: '10px', color: weekend ? 'var(--text-tertiary)' : 'var(--text-tertiary)', marginBottom: '2px' }}>
                          {WEEKDAY_ABBR[day.getDay()]}
                        </div>
                        {today ? (
                          <div style={{
                            width: '22px', height: '22px', borderRadius: '50%',
                            backgroundColor: 'var(--accent)', color: '#FFFFFF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 600, margin: '0 auto',
                          }}>
                            {day.getDate()}
                          </div>
                        ) : (
                          <div style={{
                            fontSize: '12px', fontWeight: 500, lineHeight: '22px',
                            color: weekend ? 'var(--text-tertiary)' : 'var(--text-primary)',
                            textAlign: 'center',
                          }}>
                            {day.getDate()}
                          </div>
                        )}
                      </th>
                    )
                  })}

                  {/* Total header */}
                  <th style={{
                    padding: '12px 12px',
                    textAlign: 'right',
                    minWidth: '72px',
                    borderLeft: '0.5px solid var(--border)',
                    backgroundColor: 'var(--bg-page)',
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
                      Total
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee) => {
                  const totalMins = monthlyMinutes.get(employee.id) ?? 0
                  return (
                    <tr key={employee.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                      {/* Employee cell */}
                      <td style={{
                        position: 'sticky', left: 0, zIndex: 10,
                        backgroundColor: 'var(--bg-card)',
                        borderRight: '0.5px solid var(--border)',
                        padding: '10px 16px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                            backgroundColor: 'var(--accent-light)', color: 'var(--accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', fontWeight: 700,
                          }}>
                            {getInitials(employee.full_name)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                              {employee.full_name ?? employee.email}
                            </p>
                            {employee.position && (
                              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{employee.position}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Day cells */}
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
                            style={{
                              padding: '3px 2px',
                              verticalAlign: 'middle',
                              height: '54px',
                              cursor: 'pointer',
                              backgroundColor: today
                                ? 'rgba(45,58,140,0.04)'
                                : weekend
                                ? 'var(--bg-page)'
                                : 'transparent',
                              borderRight: weekend ? '0.5px solid var(--border)' : undefined,
                              transition: 'background-color 120ms',
                            }}
                            className="hover:bg-[var(--accent-light)]"
                          >
                            {shift ? (
                              <ShiftCell shift={shift} poste={shift.poste_id ? posteMap.get(shift.poste_id) : undefined} />
                            ) : (
                              <div style={{ minHeight: '44px' }} />
                            )}
                          </td>
                        )
                      })}

                      {/* Total */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', borderLeft: '0.5px solid var(--border)', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: totalMins > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                          {formatMinutes(totalMins)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
  const bg = poste ? `${poste.color}15` : 'var(--accent-light)'
  const borderColor = poste?.color ?? 'var(--accent)'
  const textColor = poste?.color ?? 'var(--accent)'

  return (
    <div
      style={{
        backgroundColor: bg,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: '6px',
        padding: '4px 5px',
        minHeight: '44px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        margin: '0 1px',
      }}
      className="hover:brightness-[0.96] transition-all"
    >
      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
        {shift.start_time.slice(0, 5)}
      </div>
      <div style={{ fontSize: '10px', color: textColor, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
        {shift.end_time.slice(0, 5)}
      </div>
    </div>
  )
}
