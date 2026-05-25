'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Copy, Lock, Unlock, Printer, Mail, Share2, Check } from 'lucide-react'
import { type Profile, type Shift, type Poste, type LeaveRequest, type LeaveType } from '@/types'
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
  leaveRequests: LeaveRequest[]
  weekLocked: boolean
  weekPublished: boolean
  postes: Poste[]
}

// ── Leave styles ──────────────────────────────────────────────────────────────

const LEAVE_STYLES: Record<LeaveType, { bg: string; border: string; text: string; label: string }> = {
  CP:         { bg: 'var(--accent-light)',  border: 'var(--accent)',   text: 'var(--accent)',   label: 'Congé payé' },
  RTT:        { bg: 'var(--accent-light)',  border: 'var(--accent)',   text: 'var(--accent)',   label: 'RTT' },
  maladie:    { bg: '#FEE2E2',             border: 'var(--danger)',   text: 'var(--danger)',   label: 'Maladie' },
  sans_solde: { bg: 'var(--muted)',         border: 'var(--border)',   text: 'var(--text-secondary)', label: 'Sans solde' },
  autre:      { bg: '#FEF3C7',             border: 'var(--warning)',  text: 'var(--warning)',  label: 'Absence' },
}

function AbsenceBadge({ type }: { type: LeaveType }) {
  const s = LEAVE_STYLES[type]
  return (
    <div
      className="rounded-[6px] text-[11px] font-medium flex items-center gap-1 leading-none"
      style={{
        backgroundColor: s.bg,
        borderColor: s.border,
        color: s.text,
        border: '0.5px solid',
        padding: '3px 8px',
      }}
    >
      {s.label}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
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

// ── Draggable shift ───────────────────────────────────────────────────────────

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

  const bgColor = poste ? `${poste.color}20` : 'var(--accent-light)'
  const borderColor = poste?.color ?? 'var(--accent)'
  const textColor = poste?.color ?? 'var(--accent)'

  const style = {
    backgroundColor: bgColor,
    borderColor: borderColor,
    color: textColor,
    border: '0.5px solid',
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: disabled ? 'pointer' : 'grab',
    height: '24px',
    borderRadius: '6px',
    fontSize: '12px',
    padding: '0 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    overflow: 'hidden',
    flexShrink: 0,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="hover:opacity-80 transition-opacity duration-150"
      onClick={onClick}
      {...(disabled ? {} : { ...listeners, ...attributes })}
    >
      <span className="font-medium whitespace-nowrap">
        {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
      </span>
      <span className="truncate opacity-75 text-[11px]">
        {shift.position ?? employee.position}
      </span>
    </div>
  )
}

// ── Droppable cell ────────────────────────────────────────────────────────────

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
      className={className ?? ''}
      style={{
        borderBottom: '0.5px solid var(--border)',
        borderRight: '0.5px solid var(--border)',
        padding: '6px 8px',
        verticalAlign: 'top',
        minHeight: '72px',
        backgroundColor: isOver && !isLocked ? 'var(--accent-light)' : undefined,
        transition: 'background-color 150ms ease',
        ...style,
      }}
    >
      {!hasShifts ? (
        isLocked ? (
          <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>Repos</span>
          </div>
        ) : (
          <div
            onClick={onEmptyCellClick}
            style={{
              minHeight: '60px',
              backgroundColor: 'var(--bg-page)',
              borderRadius: '6px',
              border: '0.5px dashed var(--border)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 150ms ease',
            }}
            className="group hover:border-[var(--accent)] hover:bg-[var(--accent-light)]"
          >
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }} className="group-hover:text-[var(--accent)]">
              + ajouter
            </span>
          </div>
        )
      ) : (
        children
      )}
    </td>
  )
}

// ── Main grid ─────────────────────────────────────────────────────────────────

export function PlanningGrid({ weekDates, employees, shifts, leaveRequests, weekLocked, weekPublished, postes }: PlanningGridProps) {
  const router = useRouter()
  const prevMonday = addDays(weekDates[0], -7)
  const nextMonday = addDays(weekDates[0], 7)

  const prevWeekParam = toISODate(prevMonday)
  const nextWeekParam = toISODate(nextMonday)

  const weekLabel = getWeekLabel(weekDates)

  const posteMap = new Map<string, Poste>()
  for (const poste of postes) {
    posteMap.set(poste.id, poste)
  }

  const [modalState, setModalState] = useState<ModalState>({ type: 'closed' })
  const [shareCopied, setShareCopied] = useState(false)
  const [copyLoading, setCopyLoading] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null)
  const [activeDragShiftId, setActiveDragShiftId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
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

  function handleDragStart(event: DragStartEvent) {
    setActiveDragShiftId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragShiftId(null)
    const { active, over } = event
    if (!over) return

    const shiftId = String(active.id)
    const droppableId = String(over.id)
    const parts = droppableId.split('__')
    if (parts.length !== 2) return

    const [targetEmployeeId, targetDate] = parts
    const shift = shifts.find(s => s.id === shiftId)
    if (!shift) return
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

  const shiftMap = new Map<string, Shift[]>()
  for (const shift of shifts) {
    const key = `${shift.employee_id}__${shift.date}`
    const existing = shiftMap.get(key) ?? []
    existing.push(shift)
    shiftMap.set(key, existing)
  }

  const absenceMap = new Map<string, LeaveType>()
  for (const req of leaveRequests) {
    const start = new Date(req.start_date + 'T00:00:00')
    const end = new Date(req.end_date + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = toISODate(d)
      absenceMap.set(`${req.employee_id}__${dateStr}`, req.type)
    }
  }

  const activeDragShift = activeDragShiftId ? shifts.find(s => s.id === activeDragShiftId) : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">

          {/* Left: view toggle + prev */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex overflow-hidden text-[13px]"
              style={{ border: '0.5px solid var(--border)', borderRadius: '8px' }}
            >
              <Link
                href={`/manager/planning?view=day&date=${toISODate(new Date())}`}
                className="px-3 py-1.5 transition-colors duration-150"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Jour
              </Link>
              <div className="px-3 py-1.5 select-none"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  color: 'var(--bg-card)',
                  borderLeft: '0.5px solid var(--border)',
                  borderRight: '0.5px solid var(--border)',
                }}
              >
                Semaine
              </div>
              <Link
                href="/manager/planning?view=month"
                className="px-3 py-1.5 transition-colors duration-150"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Mois
              </Link>
            </div>

            <Link href={`?week=${prevWeekParam}`}>
              <button className="btn-secondary flex items-center gap-1">
                <ChevronLeft className="h-3.5 w-3.5" />
                Précédente
              </button>
            </Link>
          </div>

          {/* Centre: week label + controls */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {weekLabel}
            </span>

            {/* Published toggle */}
            <button
              role="switch"
              aria-checked={weekPublished}
              onClick={() => handleWeekStatus({ published: !weekPublished })}
              disabled={statusLoading || employees.length === 0}
              title={weekPublished ? 'Cliquer pour dépublier' : 'Cliquer pour publier'}
              className="relative inline-flex h-7 w-[110px] cursor-pointer items-center rounded-full transition-colors duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: weekPublished ? 'var(--success)' : 'var(--bg-card)',
                border: `0.5px solid ${weekPublished ? 'var(--success)' : 'var(--border)'}`,
              }}
            >
              <span
                className="absolute h-5 w-5 rounded-full transition-transform duration-150 ease-in-out"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  boxShadow: '0 0 0 0.5px var(--border)',
                  transform: weekPublished ? 'translateX(84px)' : 'translateX(4px)',
                }}
              />
              <span className="absolute inset-0 flex items-center" style={{ opacity: weekPublished ? 1 : 0, transition: 'opacity 150ms' }}>
                <span className="pl-3 text-[11px] font-medium text-white">Publié</span>
              </span>
              <span className="absolute inset-0 flex items-center justify-end" style={{ opacity: weekPublished ? 0 : 1, transition: 'opacity 150ms' }}>
                <span className="pr-3 text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Non-publié</span>
              </span>
            </button>

            {/* Lock */}
            <button
              className="btn-secondary flex items-center gap-1.5"
              style={weekLocked ? { borderColor: 'var(--warning)', color: 'var(--warning)' } : {}}
              onClick={() => handleWeekStatus({ locked: !weekLocked })}
              disabled={statusLoading}
              title={weekLocked ? 'Déverrouiller la semaine' : 'Verrouiller la semaine'}
            >
              {weekLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              {weekLocked ? 'Verrouillé' : 'Verrouiller'}
            </button>

            {/* Copy */}
            <button
              className="btn-secondary flex items-center gap-1.5"
              onClick={handleCopyWeek}
              disabled={copyLoading || employees.length === 0}
              title="Copier tous les créneaux vers la semaine suivante"
            >
              <Copy className="h-3.5 w-3.5" />
              {copyLoading ? 'Copie...' : 'Copier →'}
            </button>

            {/* Email */}
            <button
              className="btn-secondary flex items-center gap-1.5"
              onClick={handleResendEmails}
              disabled={emailLoading || employees.length === 0}
              title="Envoyer le planning par email à tous les employés"
            >
              <Mail className="h-3.5 w-3.5" />
              {emailLoading ? 'Envoi...' : 'Envoyer'}
            </button>

            {/* Share */}
            <button
              className="btn-secondary flex items-center gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                setShareCopied(true)
                setTimeout(() => setShareCopied(false), 2000)
              }}
              title="Copier le lien du planning"
            >
              {shareCopied
                ? <Check className="h-3.5 w-3.5" style={{ color: 'var(--success)' }} />
                : <Share2 className="h-3.5 w-3.5" />
              }
              {shareCopied ? 'Copié !' : 'Partager'}
            </button>

            {/* PDF */}
            <Link href={`/manager/planning/print?week=${toISODate(weekDates[0])}`} target="_blank">
              <button className="btn-secondary flex items-center gap-1.5" title="Télécharger le planning en PDF">
                <Printer className="h-3.5 w-3.5" />
                PDF
              </button>
            </Link>

            {emailFeedback && (
              <span className="text-[12px]" style={{ color: emailFeedback.startsWith('✓') ? 'var(--success)' : 'var(--danger)' }}>
                {emailFeedback}
              </span>
            )}
            {copyError && <span className="text-[12px]" style={{ color: 'var(--danger)' }}>{copyError}</span>}
            {statusError && <span className="text-[12px]" style={{ color: 'var(--danger)' }}>{statusError}</span>}
          </div>

          {/* Right: next */}
          <Link href={`?week=${nextWeekParam}`}>
            <button className="btn-secondary flex items-center gap-1">
              Suivante
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {employees.length === 0 ? (
          <div className="rounded-xl p-12 text-center"
            style={{
              border: '0.5px dashed var(--border)',
              backgroundColor: 'var(--bg-card)',
            }}
          >
            <p className="mb-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Ajoutez des employés pour commencer à planifier
            </p>
            <Link href="/manager/employees">
              <button className="btn-secondary">Gérer les employés</button>
            </Link>
          </div>
        ) : (
          /* ── Planning grid ──────────────────────────────────────────── */
          <div
            className="relative overflow-x-auto"
            style={{
              borderRadius: '12px',
              border: '0.5px solid var(--border)',
              backgroundColor: 'var(--bg-card)',
              opacity: weekLocked ? 0.65 : 1,
              filter: weekLocked ? 'saturate(0.4)' : 'none',
              transition: 'opacity 300ms, filter 300ms',
            }}
          >
            <table className="w-full min-w-[700px] border-collapse">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  {/* Employee col header */}
                  <th
                    style={{
                      borderBottom: '0.5px solid var(--border)',
                      borderRight: '0.5px solid var(--border)',
                      backgroundColor: 'var(--bg-card)',
                      padding: '10px 16px',
                      textAlign: 'left',
                      width: '180px',
                      minWidth: '160px',
                    }}
                  >
                    <span className="text-[10px] uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
                      Employés
                    </span>
                  </th>
                  {weekDates.map((date) => {
                    const { weekday, dayMonth } = getDayLabel(date)
                    const today = isToday(date)
                    return (
                      <th
                        key={toISODate(date)}
                        style={{
                          borderBottom: '0.5px solid var(--border)',
                          borderRight: '0.5px solid var(--border)',
                          backgroundColor: today ? 'var(--accent-light)' : 'var(--bg-card)',
                          padding: '10px 8px',
                          textAlign: 'center',
                        }}
                      >
                        <div className="text-[12px] font-medium" style={{ color: today ? 'var(--accent)' : 'var(--text-primary)' }}>
                          {weekday}
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: today ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                          {dayMonth}
                        </div>
                      </th>
                    )
                  })}
                  {/* Total col header */}
                  <th
                    style={{
                      borderBottom: '0.5px solid var(--border)',
                      backgroundColor: 'var(--bg-card)',
                      padding: '10px 8px',
                      textAlign: 'center',
                      width: '72px',
                    }}
                  >
                    <span className="text-[10px] uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
                      Total
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    {/* Employee cell */}
                    <td
                      style={{
                        borderBottom: '0.5px solid var(--border)',
                        borderRight: '0.5px solid var(--border)',
                        padding: '10px 16px',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
                        >
                          {getInitials(employee.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                            {employee.full_name ?? employee.email}
                          </p>
                          {employee.position && (
                            <span
                              className="text-[10px] leading-none"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              {employee.position}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Day cells */}
                    {weekDates.map((date) => {
                      const dateStr = toISODate(date)
                      const dayShifts = shiftMap.get(`${employee.id}__${dateStr}`) ?? []
                      const absenceType = absenceMap.get(`${employee.id}__${dateStr}`)
                      const hasConflict = absenceType !== undefined && dayShifts.length > 0
                      const today = isToday(date)
                      const droppableId = `${employee.id}__${dateStr}`

                      return (
                        <DroppableCell
                          key={dateStr}
                          id={droppableId}
                          isLocked={weekLocked}
                          onEmptyCellClick={() => openCreateModal(employee, date)}
                          hasShifts={dayShifts.length > 0 || absenceType !== undefined}
                          style={today ? { backgroundColor: 'rgba(var(--accent-light-rgb, 238 240 250) / 0.4)' } : undefined}
                        >
                          <div className="space-y-1" style={{ minHeight: '60px' }}>
                            {absenceType && <AbsenceBadge type={absenceType} />}

                            {hasConflict && (
                              <div
                                className="flex items-center gap-1 text-[10px] font-medium rounded-[6px]"
                                style={{
                                  border: '0.5px solid var(--warning)',
                                  backgroundColor: '#FEF3C7',
                                  color: 'var(--warning)',
                                  padding: '3px 8px',
                                }}
                              >
                                Créneau sur absence
                              </div>
                            )}

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
                                className="group cursor-pointer flex items-center justify-center transition-colors duration-150"
                                style={{
                                  height: '24px',
                                  borderRadius: '6px',
                                  border: '0.5px dashed var(--border)',
                                  backgroundColor: 'transparent',
                                }}
                              >
                                <span
                                  className="text-[10px] transition-colors duration-150"
                                  style={{ color: 'var(--text-tertiary)' }}
                                >
                                  +
                                </span>
                              </div>
                            )}
                          </div>
                        </DroppableCell>
                      )
                    })}

                    {/* Weekly total */}
                    {(() => {
                      const employeeShifts = shifts.filter(s => s.employee_id === employee.id)
                      const totalHours = employeeShifts.reduce(
                        (sum, s) => sum + calcShiftHours(s.start_time, s.end_time, s.break_minutes),
                        0
                      )
                      return (
                        <td
                          style={{
                            borderBottom: '0.5px solid var(--border)',
                            padding: '10px 8px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}
                        >
                          <span
                            className="text-[13px] font-medium"
                            style={{ color: totalHours > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                          >
                            {totalHours > 0 ? formatHours(totalHours) : '—'}
                          </span>
                        </td>
                      )
                    })()}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    style={{
                      borderTop: '0.5px solid var(--border)',
                      borderRight: '0.5px solid var(--border)',
                      backgroundColor: 'var(--bg-page)',
                      padding: '8px 16px',
                    }}
                  >
                    <span className="text-[10px] uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
                      Total / jour
                    </span>
                  </td>
                  {weekDates.map((date) => {
                    const dateStr = toISODate(date)
                    const dayTotal = shifts
                      .filter(s => s.date === dateStr)
                      .reduce((sum, s) => sum + calcShiftHours(s.start_time, s.end_time, s.break_minutes), 0)
                    const today = isToday(date)
                    return (
                      <td
                        key={dateStr}
                        style={{
                          borderTop: '0.5px solid var(--border)',
                          borderRight: '0.5px solid var(--border)',
                          backgroundColor: today ? 'var(--accent-light)' : 'var(--bg-page)',
                          padding: '8px',
                          textAlign: 'center',
                        }}
                      >
                        <span
                          className="text-[13px] font-medium"
                          style={{ color: dayTotal > 0 ? (today ? 'var(--accent)' : 'var(--text-primary)') : 'var(--text-tertiary)' }}
                        >
                          {dayTotal > 0 ? formatHours(dayTotal) : '—'}
                        </span>
                      </td>
                    )
                  })}
                  <td
                    style={{
                      borderTop: '0.5px solid var(--border)',
                      backgroundColor: 'var(--bg-page)',
                      padding: '8px',
                      textAlign: 'center',
                    }}
                  >
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatHours(shifts.reduce((sum, s) => sum + calcShiftHours(s.start_time, s.end_time, s.break_minutes), 0))}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

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
          <div
            className="text-[12px] font-medium cursor-grabbing"
            style={{
              height: '24px',
              borderRadius: '6px',
              border: '0.5px solid var(--accent)',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent)',
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{formatTime(activeDragShift.start_time)}–{formatTime(activeDragShift.end_time)}</span>
            <span className="opacity-75 text-[11px]">{activeDragShift.position}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
