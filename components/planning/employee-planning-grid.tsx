'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type Profile, type Shift, type Poste, type LeaveRequest, type LeaveType } from '@/types'
import { getWeekLabel, toISODate, addDays } from '@/lib/utils/dates'
import { calcHours, formatHours, formatTime, isToday } from '@/lib/planning-utils'

interface EmployeePlanningGridProps {
  weekDates: Date[]
  employee: Profile
  shifts: Shift[]
  postes: Poste[]
  leaveRequests: LeaveRequest[]
  isCurrentWeek?: boolean
}

const LEAVE_STYLES_LOCAL: Record<LeaveType, { style: React.CSSProperties; label: string }> = {
  CP:         { label: 'Congés payés',  style: { backgroundColor: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--accent)' } },
  RTT:        { label: 'RTT',           style: { backgroundColor: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--accent)' } },
  maladie:    { label: 'Arrêt maladie', style: { backgroundColor: 'rgba(255,107,107,0.1)', borderColor: 'var(--danger)', color: 'var(--danger)' } },
  sans_solde: { label: 'Sans solde',    style: { backgroundColor: 'var(--bg-page)', borderColor: 'var(--border)', color: 'var(--text-secondary)' } },
  autre:      { label: 'Autre',         style: { backgroundColor: 'rgba(255,179,71,0.1)', borderColor: 'var(--warning)', color: 'var(--warning)' } },
}

function AbsenceBadge({ type }: { type: LeaveType }) {
  const s = LEAVE_STYLES_LOCAL[type]
  return (
    <div className="rounded-lg border px-2 py-1.5 text-[11px] font-semibold flex items-center gap-1" style={s.style}>
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

// ── Mobile planning view ────────────────────────────────────────────────────────────

interface MobilePlanningViewProps {
  weekDates: Date[]
  employee: Profile
  shiftMap: Map<string, Shift[]>
  absenceMap: Map<string, LeaveType>
  posteMap: Map<string, Poste>
  totalHours: number
  totalDays: number
  prevWeekParam: string
  nextWeekParam: string
  weekLabel: string
  isCurrentWeek: boolean
}

function MobilePlanningView({
  weekDates, employee, shiftMap, absenceMap, posteMap,
  totalHours, totalDays, prevWeekParam, nextWeekParam, weekLabel, isCurrentWeek,
}: MobilePlanningViewProps) {
  const todayIndex = weekDates.findIndex(d => isToday(d))
  const [selectedIndex, setSelectedIndex] = useState(todayIndex >= 0 ? todayIndex : 0)

  const selectedDate = weekDates[selectedIndex]
  const selectedDateStr = toISODate(selectedDate)
  const dayShifts = shiftMap.get(selectedDateStr) ?? []
  const absenceType = absenceMap.get(selectedDateStr)

  const selectedDayLabel = selectedDate.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`?week=${prevWeekParam}`}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold" style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-primary)' }}>
            {weekLabel}
          </span>
          {isCurrentWeek && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-light)', fontFamily: 'var(--font-dm-sans)' }}
            >
              Actuelle
            </span>
          )}
        </div>
        <Link
          href={`?week=${nextWeekParam}`}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Day selector grid */}
      <div className="grid grid-cols-7 gap-1">
        {weekDates.map((date, i) => {
          const dateStr = toISODate(date)
          const today = isToday(date)
          const selected = i === selectedIndex
          const hasActivity = (shiftMap.get(dateStr)?.length ?? 0) > 0 || !!absenceMap.get(dateStr)
          const wd = date.toLocaleDateString('fr-FR', { weekday: 'narrow' }).toUpperCase()
          const dayNum = date.getDate()

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedIndex(i)}
              className="flex flex-col items-center py-2.5 px-0.5 rounded-xl transition-all duration-150 gap-0.5"
              style={{
                background: selected ? 'var(--accent)' : today ? 'var(--accent-light)' : 'var(--bg-card)',
                border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}
            >
              <span
                className="text-[9px] font-semibold uppercase tracking-wide"
                style={{ fontFamily: 'var(--font-dm-sans)', color: selected ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)' }}
              >
                {wd}
              </span>
              <span
                className="text-[16px] font-bold leading-none"
                style={{ fontFamily: 'var(--font-manrope)', color: selected ? '#fff' : today ? 'var(--accent)' : 'var(--text-primary)' }}
              >
                {dayNum}
              </span>
              {hasActivity && (
                <div
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ background: selected ? 'rgba(255,255,255,0.55)' : 'var(--accent)' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Day detail card */}
      <div
        className="rounded-[14px] overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: isToday(selectedDate) ? '1px solid var(--accent)' : '1px solid var(--border)',
          backgroundColor: isToday(selectedDate) ? 'linear-gradient(135deg, rgba(108,99,255,0.06) 0%, var(--bg-card) 100%)' : undefined,
        }}
      >
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3
            className="text-[14px] font-semibold capitalize"
            style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-primary)' }}
          >
            {selectedDayLabel}
          </h3>
        </div>

        <div className="px-4 py-4">
          {absenceType && (
            <div className="mb-3">
              <AbsenceBadge type={absenceType} />
            </div>
          )}

          {dayShifts.length === 0 && !absenceType ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
                <span className="text-[18px]">😴</span>
              </div>
              <p className="text-[13px]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>Repos</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dayShifts.map((shift) => {
                const poste = shift.poste_id ? posteMap.get(shift.poste_id) : null
                const accentColor = poste?.color ?? 'var(--accent)'
                const bgColor = poste ? `${poste.color}10` : 'rgba(108,99,255,0.06)'
                const hours = calcHours(shift.start_time, shift.end_time, shift.break_minutes)

                return (
                  <div
                    key={shift.id}
                    className="rounded-[12px] p-3.5 pl-4"
                    style={{
                      background: bgColor,
                      borderTop: `1px solid ${accentColor}25`,
                      borderRight: `1px solid ${accentColor}25`,
                      borderBottom: `1px solid ${accentColor}25`,
                      borderLeft: `3px solid ${accentColor}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[17px] font-bold tabular-nums"
                        style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-primary)' }}
                      >
                        {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                      </span>
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                        style={{ background: `${accentColor}20`, color: accentColor, fontFamily: 'var(--font-dm-sans)' }}
                      >
                        {formatHours(hours)}
                      </span>
                    </div>
                    {(shift.position ?? employee.position) && (
                      <p
                        className="text-[12px] mt-1 font-medium"
                        style={{ fontFamily: 'var(--font-dm-sans)', color: accentColor, opacity: 0.85 }}
                      >
                        {shift.position ?? employee.position}
                      </p>
                    )}
                    {shift.break_minutes > 0 && (
                      <p className="text-[11px] mt-1" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
                        Pause {shift.break_minutes} min
                      </p>
                    )}
                    {shift.notes && (
                      <p className="text-[12px] mt-1 italic" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
                        {shift.notes}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Week summary */}
        <div className="px-4 py-3 flex items-center justify-between gap-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-center flex-1">
            <p className="text-[18px] font-bold" style={{ fontFamily: 'var(--font-manrope)', color: totalHours > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              {totalHours > 0 ? formatHours(totalHours) : '—'}
            </p>
            <p className="text-[10px] uppercase tracking-[0.06em] mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
              Heures planifiées
            </p>
          </div>
          <div className="w-px h-8" style={{ backgroundColor: 'var(--border)' }} />
          <div className="text-center flex-1">
            <p className="text-[18px] font-bold" style={{ fontFamily: 'var(--font-manrope)', color: totalDays > 0 ? 'var(--accent)' : 'var(--text-tertiary)' }}>
              {totalDays > 0 ? totalDays : '—'}
            </p>
            <p className="text-[10px] uppercase tracking-[0.06em] mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
              Jours travaillés
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────────

export function EmployeePlanningGrid({ weekDates, employee, shifts, postes, leaveRequests, isCurrentWeek = false }: EmployeePlanningGridProps) {
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
    (sum, s) => sum + calcHours(s.start_time, s.end_time, s.break_minutes),
    0
  )

  const totalDays = new Set(shifts.map(s => s.date)).size

  return (
    <div>
      {/* Mobile view */}
      <div className="block md:hidden">
        <MobilePlanningView
          weekDates={weekDates}
          employee={employee}
          shiftMap={shiftMap}
          absenceMap={absenceMap}
          posteMap={posteMap}
          totalHours={totalHours}
          totalDays={totalDays}
          prevWeekParam={prevWeekParam}
          nextWeekParam={nextWeekParam}
          weekLabel={weekLabel}
          isCurrentWeek={isCurrentWeek}
        />
      </div>

      {/* Desktop view */}
      <div className="hidden md:block space-y-4">
        {/* Header navigation */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link href={`?week=${prevWeekParam}`}>
            <Button variant="outline" size="sm" className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Semaine précédente
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <h2
              className="text-[15px] font-semibold"
              style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-primary)' }}
            >
              {weekLabel}
            </h2>
            {isCurrentWeek && (
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-light)', fontFamily: 'var(--font-dm-sans)' }}
              >
                Cette semaine
              </span>
            )}
          </div>

          <Link href={`?week=${nextWeekParam}`}>
            <Button variant="outline" size="sm" className="gap-1">
              Semaine suivante
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Planning grid */}
        <div className="overflow-x-auto rounded-[14px]" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr>
                <th
                  className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.06em] w-48 min-w-[180px]"
                  style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontFamily: 'var(--font-dm-sans)' }}
                >
                  Semaine
                </th>
                {weekDates.map((date) => {
                  const { weekday, dayMonth } = getDayLabel(date)
                  const today = isToday(date)
                  return (
                    <th
                      key={toISODate(date)}
                      className="px-3 py-3 text-center"
                      style={{
                        backgroundColor: today ? 'rgba(108,99,255,0.08)' : 'var(--bg-page)',
                        color: today ? 'var(--accent)' : 'var(--text-secondary)',
                        borderBottom: '1px solid var(--border)',
                        borderRight: '1px solid var(--border)',
                      }}
                    >
                      <div className="text-[13px] font-semibold" style={{ fontFamily: 'var(--font-manrope)' }}>{weekday}</div>
                      <div className="text-[11px] font-normal mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)', color: today ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                        {dayMonth}
                      </div>
                    </th>
                  )
                })}
                <th
                  className="px-3 py-3 text-center text-[11px] font-medium uppercase tracking-[0.06em] w-20"
                  style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-dm-sans)' }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: 'var(--bg-card)' }}>
                <td className="px-4 py-3" style={{ borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p className="truncate text-[13px] font-semibold" style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-primary)' }}>
                      {employee.full_name ?? employee.email}
                    </p>
                    {employee.position && (
                      <p className="text-[11px] mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-secondary)' }}>
                        {employee.position}
                      </p>
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
                        borderRight: '1px solid var(--border)',
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: today ? 'rgba(108,99,255,0.04)' : undefined,
                      }}
                    >
                      {dayShifts.length === 0 && !absenceType ? (
                        <div className="min-h-[80px] rounded-lg" style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)' }} />
                      ) : (
                        <div className="min-h-[80px] space-y-1">
                          {absenceType && <AbsenceBadge type={absenceType} />}
                          {dayShifts.map((shift) => {
                            const poste = shift.poste_id ? posteMap.get(shift.poste_id) : null
                            const accentColor = poste?.color ?? 'var(--accent)'
                            const bgColor = poste ? `${poste.color}10` : 'rgba(108,99,255,0.06)'
                            return (
                              <div
                                key={shift.id}
                                className="rounded-md p-1.5 pl-2.5"
                                style={{
                                  backgroundColor: bgColor,
                                  borderTop: `1px solid ${accentColor}25`,
                                  borderRight: `1px solid ${accentColor}25`,
                                  borderBottom: `1px solid ${accentColor}25`,
                                  borderLeft: `3px solid ${accentColor}`,
                                  color: accentColor,
                                }}
                              >
                                <p className="font-semibold text-[12px]" style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-primary)' }}>
                                  {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                                </p>
                                <p className="truncate text-[11px]" style={{ fontFamily: 'var(--font-dm-sans)', color: accentColor, opacity: 0.85 }}>
                                  {shift.position ?? employee.position}
                                </p>
                                {shift.break_minutes > 0 && (
                                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                    pause {shift.break_minutes}min
                                  </p>
                                )}
                                {shift.notes && (
                                  <p className="truncate mt-0.5 italic text-[10px]" style={{ color: accentColor, opacity: 0.7 }}>
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

                <td className="px-3 py-3 text-center align-middle" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span
                    className="text-[14px] font-bold"
                    style={{ fontFamily: 'var(--font-manrope)', color: totalHours > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                  >
                    {totalHours > 0 ? formatHours(totalHours) : '—'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
