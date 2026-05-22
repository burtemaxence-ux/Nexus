'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type Profile, type Shift, type Poste } from '@/types'
import { getWeekLabel, toISODate, addDays, formatDateFR } from '@/lib/utils/dates'
import { ShiftModal, type ModalState } from '@/components/planning/shift-modal'

interface PlanningGridProps {
  weekDates: Date[]
  employees: Profile[]
  shifts: Shift[]
  weekStatus: 'draft' | 'published'
  postes: Poste[]
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getDayLabel(date: Date): { weekday: string; dayMonth: string } {
  const weekday = date.toLocaleDateString('fr-FR', { weekday: 'short' })
  const dayMonth = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  // Capitalize first letter
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

function calcShiftHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let minutes = (eh * 60 + em) - (sh * 60 + sm)
  if (minutes < 0) minutes += 24 * 60
  return minutes / 60
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export function PlanningGrid({ weekDates, employees, shifts, weekStatus, postes }: PlanningGridProps) {
  const router = useRouter()
  const prevMonday = addDays(weekDates[0], -7)
  const nextMonday = addDays(weekDates[0], 7)

  const prevWeekParam = toISODate(prevMonday)
  const nextWeekParam = toISODate(nextMonday)

  const weekLabel = getWeekLabel(weekDates)

  // Build poste lookup map
  const posteMap = new Map<string, Poste>()
  for (const poste of postes) {
    posteMap.set(poste.id, poste)
  }

  // Modal state
  const [modalState, setModalState] = useState<ModalState>({ type: 'closed' })
  const [copyLoading, setCopyLoading] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  function openCreateModal(employee: Profile, date: Date) {
    setModalState({ type: 'create', employee, date })
  }

  function openViewModal(shift: Shift, employee: Profile, date: Date) {
    setModalState({ type: 'view', shift, employee, date })
  }

  function closeModal() {
    setModalState({ type: 'closed' })
  }

  async function handleCopyWeek() {
    setCopyLoading(true)
    setCopyError(null)
    setCopySuccess(false)

    try {
      const fromMonday = toISODate(weekDates[0])
      const response = await fetch('/api/shifts/copy-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_monday: fromMonday }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Erreur lors de la copie')
      }

      const data = await response.json()
      setCopySuccess(true)
      // Navigate to next week to see the result
      router.push(`?week=${nextWeekParam}`)
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setCopyLoading(false)
    }
  }

  // Index shifts by employee_id + date for fast lookup
  const shiftMap = new Map<string, Shift[]>()
  for (const shift of shifts) {
    const key = `${shift.employee_id}__${shift.date}`
    const existing = shiftMap.get(key) ?? []
    existing.push(shift)
    shiftMap.set(key, existing)
  }

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

        <div className="flex items-center gap-3 flex-wrap justify-center">
          <h2 className="text-lg font-semibold text-gray-900">{weekLabel}</h2>
          {weekStatus === 'published' ? (
            <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
              Publié
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100">
              Brouillon
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleCopyWeek}
            disabled={copyLoading || employees.length === 0}
            title="Copier tous les créneaux de cette semaine vers la semaine suivante"
          >
            <Copy className="h-3.5 w-3.5" />
            {copyLoading ? 'Copie...' : 'Copier vers semaine suivante'}
          </Button>
          {copyError && (
            <span className="text-xs text-red-600">{copyError}</span>
          )}
        </div>

        <Link href={`?week=${nextWeekParam}`}>
          <Button variant="outline" size="sm" className="gap-1">
            Semaine suivante
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      {employees.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500 mb-3">
            Ajoutez des employés pour commencer à planifier
          </p>
          <Link href="/manager/employees">
            <Button variant="outline" size="sm">
              Gérer les employés
            </Button>
          </Link>
        </div>
      ) : (
        /* Planning grid */
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr>
                {/* Employee column header */}
                <th className="border-b border-r border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-600 w-48 min-w-[180px]">
                  Employés
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
              {employees.map((employee, rowIndex) => (
                <tr
                  key={employee.id}
                  className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                >
                  {/* Employee cell */}
                  <td className="border-b border-r border-gray-200 px-4 py-3 last:border-b-0">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                        {getInitials(employee.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {employee.full_name ?? employee.email}
                        </p>
                        {employee.position && (
                          <Badge
                            variant="outline"
                            className="mt-0.5 px-1.5 py-0 text-[10px] leading-4 font-normal text-gray-500 border-gray-200"
                          >
                            {employee.position}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Day cells */}
                  {weekDates.map((date) => {
                    const dateStr = toISODate(date)
                    const dayShifts = shiftMap.get(`${employee.id}__${dateStr}`) ?? []
                    const today = isToday(date)

                    return (
                      <td
                        key={dateStr}
                        className={`border-b border-r border-gray-200 px-2 py-2 align-top ${
                          today ? 'bg-blue-50/30' : ''
                        }`}
                        style={{ minHeight: '80px' }}
                      >
                        {dayShifts.length === 0 ? (
                          <div
                            onClick={() => openCreateModal(employee, date)}
                            className="min-h-[80px] bg-gray-50 hover:bg-blue-50 cursor-pointer transition-colors rounded-sm border border-dashed border-gray-200 hover:border-blue-300"
                          />
                        ) : (
                          <div className="min-h-[80px] space-y-1">
                            {dayShifts.map((shift) => {
                              const poste = shift.poste_id ? posteMap.get(shift.poste_id) : null
                              const bgColor = poste ? `${poste.color}20` : '#EFF6FF'
                              const borderColor = poste?.color ?? '#BFDBFE'
                              const textColor = poste?.color ?? '#1D4ED8'
                              return (
                              <div
                                key={shift.id}
                                onClick={() => openViewModal(shift, employee, date)}
                                style={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor }}
                                className="rounded-md border p-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                              >
                                <p className="font-semibold">
                                  {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                                </p>
                                <p className="truncate" style={{ color: textColor, opacity: 0.85 }}>
                                  {shift.position ?? employee.position}
                                </p>
                              </div>
                              )
                            })}
                            <div
                              onClick={() => openCreateModal(employee, date)}
                              className="h-6 bg-gray-50 hover:bg-blue-50 cursor-pointer transition-colors rounded-sm border border-dashed border-gray-200 hover:border-blue-300 flex items-center justify-center"
                            >
                              <span className="text-[10px] text-gray-400 hover:text-blue-400">+ ajouter</span>
                            </div>
                          </div>
                        )}
                      </td>
                    )
                  })}
                  {/* Weekly total cell */}
                  {(() => {
                    const employeeShifts = shifts.filter(s => s.employee_id === employee.id)
                    const totalHours = employeeShifts.reduce(
                      (sum, s) => sum + calcShiftHours(s.start_time, s.end_time),
                      0
                    )
                    return (
                      <td className="border-b border-gray-200 px-3 py-3 text-center align-middle">
                        <span className={`text-sm font-semibold ${totalHours > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                          {totalHours > 0 ? formatHours(totalHours) : '—'}
                        </span>
                      </td>
                    )
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Shift modal */}
      <ShiftModal modalState={modalState} onClose={closeModal} postes={postes} />
    </div>
  )
}
