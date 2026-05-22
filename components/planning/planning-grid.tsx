'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Copy, Lock, Unlock, Printer, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type Profile, type Shift, type Poste } from '@/types'
import { getWeekLabel, toISODate, addDays } from '@/lib/utils/dates'
import { ShiftModal, type ModalState } from '@/components/planning/shift-modal'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface PlanningGridProps {
  weekDates: Date[]
  employees: Profile[]
  shifts: Shift[]
  weekLocked: boolean
  weekPublished: boolean
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

// --- Draggable shift block ---
interface DraggableShiftProps {
  shift: Shift
  poste: Poste | null | undefined
  employee: Profile
  onClick: () => void
  disabled: boolean
}

function DraggableShift({ shift, poste, employee, onClick, disabled }: DraggableShiftProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
    disabled,
  })

  const bgColor = poste ? `${poste.color}20` : '#EFF6FF'
  const borderColor = poste?.color ?? '#BFDBFE'
  const textColor = poste?.color ?? '#1D4ED8'

  const style = {
    backgroundColor: bgColor,
    borderColor: borderColor,
    color: textColor,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: disabled ? 'pointer' : 'grab',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md border p-1.5 text-xs hover:opacity-80 transition-opacity"
      onClick={onClick}
      {...(disabled ? {} : { ...listeners, ...attributes })}
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
    </div>
  )
}

// --- Droppable cell ---
interface DroppableCellProps {
  id: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  isLocked: boolean
  onEmptyCellClick: () => void
  hasShifts: boolean
}

function DroppableCell({ id, children, className, style, isLocked, onEmptyCellClick, hasShifts }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <td
      ref={setNodeRef}
      className={`border-b border-r border-gray-200 px-2 py-2 align-top transition-colors ${isOver && !isLocked ? 'bg-blue-100/50' : ''} ${className ?? ''}`}
      style={{ minHeight: '80px', ...style }}
    >
      {!hasShifts ? (
        <div
          onClick={isLocked ? undefined : onEmptyCellClick}
          className={`min-h-[80px] bg-gray-50 rounded-sm border border-dashed border-gray-200 transition-colors ${
            isLocked ? 'cursor-default' : 'hover:bg-blue-50 cursor-pointer hover:border-blue-300'
          }`}
        />
      ) : (
        children
      )}
    </td>
  )
}

export function PlanningGrid({ weekDates, employees, shifts, weekLocked, weekPublished, postes }: PlanningGridProps) {
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
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null)

  // DnD state
  const [activeDragShiftId, setActiveDragShiftId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  function openCreateModal(employee: Profile, date: Date) {
    if (weekLocked) return
    setModalState({ type: 'create', employee, date })
  }

  function openViewModal(shift: Shift, employee: Profile, date: Date) {
    setModalState({ type: 'view', shift, employee, date, readOnly: weekLocked })
  }

  function closeModal() {
    setModalState({ type: 'closed' })
  }

  async function handleCopyWeek() {
    setCopyLoading(true)
    setCopyError(null)

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

      router.push(`?week=${nextWeekParam}`)
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setCopyLoading(false)
    }
  }

  async function handleResendEmails() {
    setEmailLoading(true)
    setEmailFeedback(null)
    try {
      const response = await fetch('/api/shifts/send-planning-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_monday: toISODate(weekDates[0]) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Erreur')
      setEmailFeedback(`✓ ${data.sent} email${data.sent !== 1 ? 's' : ''} envoyé${data.sent !== 1 ? 's' : ''}`)
      setTimeout(() => setEmailFeedback(null), 4000)
    } catch (err) {
      setEmailFeedback(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleWeekStatus(payload: { published?: boolean; locked?: boolean }) {
    setStatusLoading(true)
    setStatusError(null)

    try {
      const response = await fetch('/api/week-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_monday: toISODate(weekDates[0]), ...payload }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Erreur')
      }

      router.refresh()
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setStatusLoading(false)
    }
  }

  // DnD handlers
  function handleDragStart(event: DragStartEvent) {
    setActiveDragShiftId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragShiftId(null)
    const { active, over } = event

    if (!over) return

    const shiftId = String(active.id)
    const droppableId = String(over.id)

    // droppableId format: "employeeId__dateStr"
    const parts = droppableId.split('__')
    if (parts.length !== 2) return

    const [targetEmployeeId, targetDate] = parts

    // Find the shift being dragged
    const shift = shifts.find(s => s.id === shiftId)
    if (!shift) return

    // If dropped on the same cell, do nothing
    if (shift.employee_id === targetEmployeeId && shift.date === targetDate) return

    try {
      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: targetEmployeeId, date: targetDate }),
      })

      if (!response.ok) {
        console.error('Erreur lors du déplacement du créneau')
        return
      }

      router.refresh()
    } catch (err) {
      console.error('Erreur lors du déplacement du créneau:', err)
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

  // Active drag shift for overlay
  const activeDragShift = activeDragShiftId ? shifts.find(s => s.id === activeDragShiftId) : null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Header navigation */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
              <div className="px-4 py-2 bg-gray-900 text-white select-none">
                Semaine
              </div>
              <Link
                href={`/manager/planning?view=month`}
                className="px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Mois
              </Link>
            </div>

            <Link href={`?week=${prevWeekParam}`}>
              <Button variant="outline" size="sm" className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                Précédente
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <h2 className="text-lg font-semibold text-gray-900">{weekLabel}</h2>

            {/* Toggle Publié / Non-publié — indépendant */}
            <button
              role="switch"
              aria-checked={weekPublished}
              onClick={() => handleWeekStatus({ published: !weekPublished })}
              disabled={statusLoading || employees.length === 0}
              title={weekPublished ? 'Cliquer pour dépublier' : 'Cliquer pour publier'}
              className={`relative inline-flex h-7 w-[120px] cursor-pointer items-center rounded-full border transition-colors duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                weekPublished
                  ? 'bg-green-500 border-green-500'
                  : 'bg-white border-gray-300'
              }`}
            >
              {/* Knob */}
              <span
                className={`absolute h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-300 ease-in-out ${
                  weekPublished ? 'translate-x-[92px]' : 'translate-x-1'
                }`}
              />
              {/* Labels */}
              <span
                className={`absolute inset-0 flex items-center transition-opacity duration-200 ${
                  weekPublished ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <span className="pl-3 text-xs font-semibold text-white">Publié</span>
              </span>
              <span
                className={`absolute inset-0 flex items-center justify-end transition-opacity duration-200 ${
                  weekPublished ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <span className="pr-3 text-xs font-semibold text-gray-500">Non-publié</span>
              </span>
            </button>

            {/* Verrou — indépendant */}
            <Button
              variant="outline"
              size="sm"
              className={`gap-1.5 ${weekLocked ? 'border-orange-300 text-orange-700 hover:bg-orange-50' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              onClick={() => handleWeekStatus({ locked: !weekLocked })}
              disabled={statusLoading}
              title={weekLocked ? 'Déverrouiller la semaine' : 'Verrouiller la semaine'}
            >
              {weekLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              {weekLocked ? 'Verrouillé' : 'Déverrouiller'}
            </Button>

            {/* Copier la semaine */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleCopyWeek}
              disabled={copyLoading || employees.length === 0}
              title="Copier tous les créneaux vers la semaine suivante"
            >
              <Copy className="h-3.5 w-3.5" />
              {copyLoading ? 'Copie...' : 'Copier →'}
            </Button>

            {/* Envoyer le planning par email */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleResendEmails}
              disabled={emailLoading || employees.length === 0}
              title="Envoyer le planning par email à tous les employés"
            >
              <Mail className="h-3.5 w-3.5" />
              {emailLoading ? 'Envoi...' : 'Envoyer le planning'}
            </Button>

            {/* PDF */}
            <Link href={`/manager/planning/print?week=${toISODate(weekDates[0])}`} target="_blank">
              <Button variant="outline" size="sm" className="gap-1.5" title="Télécharger le planning en PDF">
                <Printer className="h-3.5 w-3.5" />
                PDF
              </Button>
            </Link>

            {emailFeedback && (
              <span className={`text-xs ${emailFeedback.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{emailFeedback}</span>
            )}
            {copyError && <span className="text-xs text-red-600">{copyError}</span>}
            {statusError && <span className="text-xs text-red-600">{statusError}</span>}
          </div>

          <Link href={`?week=${nextWeekParam}`}>
            <Button variant="outline" size="sm" className="gap-1">
              Suivante
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
          <div className={`relative overflow-x-auto rounded-lg border bg-white transition-all duration-300 ${weekLocked ? 'border-gray-300 opacity-60 saturate-50' : 'border-gray-200'}`}>
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
                      const droppableId = `${employee.id}__${dateStr}`

                      return (
                        <DroppableCell
                          key={dateStr}
                          id={droppableId}
                          isLocked={weekLocked}
                          onEmptyCellClick={() => openCreateModal(employee, date)}
                          hasShifts={dayShifts.length > 0}
                          className={today ? 'bg-blue-50/30' : ''}
                        >
                          <div className="min-h-[80px] space-y-1">
                            {dayShifts.map((shift) => {
                              const poste = shift.poste_id ? posteMap.get(shift.poste_id) : null
                              return (
                                <DraggableShift
                                  key={shift.id}
                                  shift={shift}
                                  poste={poste}
                                  employee={employee}
                                  onClick={() => openViewModal(shift, employee, date)}
                                  disabled={weekLocked}
                                />
                              )
                            })}
                            {!weekLocked && (
                              <div
                                onClick={() => openCreateModal(employee, date)}
                                className="h-6 bg-gray-50 hover:bg-blue-50 cursor-pointer transition-colors rounded-sm border border-dashed border-gray-200 hover:border-blue-300 flex items-center justify-center"
                              >
                                <span className="text-[10px] text-gray-400 hover:text-blue-400">+ ajouter</span>
                              </div>
                            )}
                          </div>
                        </DroppableCell>
                      )
                    })}
                    {/* Weekly total cell */}
                    {(() => {
                      const employeeShifts = shifts.filter(s => s.employee_id === employee.id)
                      const totalHours = employeeShifts.reduce(
                        (sum, s) => sum + calcShiftHours(s.start_time, s.end_time, s.break_minutes),
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
        <ShiftModal
          modalState={modalState}
          onClose={closeModal}
          postes={postes}
          employees={employees}
          weekDates={weekDates}
        />
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDragShift ? (
          <div className="rounded-md border p-1.5 text-xs bg-white shadow-lg opacity-90 border-blue-300 text-blue-700 cursor-grabbing">
            <p className="font-semibold">
              {formatTime(activeDragShift.start_time)} – {formatTime(activeDragShift.end_time)}
            </p>
            <p className="truncate opacity-85">{activeDragShift.position}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
