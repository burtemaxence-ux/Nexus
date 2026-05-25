'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Copy, Lock, Unlock,
  Mail, Share2, Check, Plus, AlertTriangle, Filter,
  Edit2, Trash2, CopyPlus, Printer,
} from 'lucide-react'
import { type Profile, type Shift, type Poste, type LeaveRequest, type LeaveType } from '@/types'
import { getWeekLabel, toISODate, addDays } from '@/lib/utils/dates'
import { ShiftModal, type ModalState } from '@/components/planning/shift-modal'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDraggable, useDroppable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

// ── Constants ──────────────────────────────────────────────────────────────────
const TICK_HOURS = [0, 6, 12, 18, 24]

const LEAVE_STYLES: Record<LeaveType, { bg: string; color: string; label: string }> = {
  CP:         { bg: 'var(--accent-light)', color: 'var(--accent)',         label: 'CP' },
  RTT:        { bg: 'var(--accent-light)', color: 'var(--accent)',         label: 'RTT' },
  maladie:    { bg: '#FEE2E2',            color: 'var(--danger)',          label: 'Maladie' },
  sans_solde: { bg: 'var(--bg-page)',      color: 'var(--text-secondary)', label: 'Sans solde' },
  autre:      { bg: '#FEF3C7',            color: 'var(--warning)',         label: 'Absence' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function shiftBarStyle(start: string, end: string): { left: string; width: string } {
  const startMin = timeToMinutes(start)
  let endMin = timeToMinutes(end)
  if (endMin <= startMin) endMin += 1440
  const left = (startMin / 1440) * 100
  const width = Math.max(((endMin - startMin) / 1440) * 100, 2.5)
  return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }
}

function formatTime(t: string): string { return t.slice(0, 5) }

function calcHours(start: string, end: string, brk: number): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let m = (eh * 60 + em) - (sh * 60 + sm)
  if (m < 0) m += 1440
  return Math.max(0, (m - brk) / 60)
}

function formatHours(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function isToday(date: Date): boolean {
  const t = new Date()
  return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear()
}

function getWeekMonday(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  return toISODate(d)
}

// ── Context menu ───────────────────────────────────────────────────────────────
type CtxMenu = { x: number; y: number; shift: Shift; employee: Profile; date: Date }

function ContextMenu({ menu, weekDates, onEdit, onDelete, onCopyTo, onClose }: {
  menu: CtxMenu
  weekDates: Date[]
  onEdit: () => void
  onDelete: () => void
  onCopyTo: (date: Date) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key) }
  }, [onClose])

  const otherDays = weekDates.filter(d => toISODate(d) !== menu.shift.date)

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: menu.y,
        left: menu.x,
        zIndex: 9999,
        backgroundColor: 'var(--bg-card)',
        border: '0.5px solid var(--border)',
        borderRadius: '10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        minWidth: '190px',
        overflow: 'hidden',
        animation: 'dp-fade-up 120ms ease-out both',
      }}
    >
      {/* Header */}
      <div style={{ padding: '8px 12px 7px', borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {formatTime(menu.shift.start_time)} → {formatTime(menu.shift.end_time)}
          <span style={{ marginLeft: 6, fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '11px' }}>
            {formatHours(calcHours(menu.shift.start_time, menu.shift.end_time, menu.shift.break_minutes))}
          </span>
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
          {menu.employee.full_name ?? menu.employee.email}
        </p>
      </div>

      <div style={{ padding: '4px' }}>
        <CtxBtn icon={<Edit2 size={13} />} label="Modifier" onClick={onEdit} />

        {otherDays.length > 0 && (
          <>
            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', padding: '5px 10px 2px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Copier vers
            </p>
            {otherDays.map(d => (
              <CtxBtn
                key={toISODate(d)}
                icon={<CopyPlus size={13} />}
                label={d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }).replace('.', '')}
                onClick={() => onCopyTo(d)}
              />
            ))}
          </>
        )}

        <div style={{ height: '0.5px', backgroundColor: 'var(--border)', margin: '4px 0' }} />
        <CtxBtn icon={<Trash2 size={13} />} label="Supprimer" onClick={onDelete} danger />
      </div>
    </div>
  )
}

function CtxBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        width: '100%', padding: '6px 10px', borderRadius: '6px',
        fontSize: '13px', border: 'none', cursor: 'pointer',
        color: danger ? 'var(--danger)' : hov ? 'var(--text-primary)' : 'var(--text-secondary)',
        backgroundColor: hov ? (danger ? '#FEE2E2' : 'var(--accent-light)') : 'transparent',
        transition: 'all 100ms ease',
      }}
    >
      {icon}{label}
    </button>
  )
}

// ── Draggable shift bar ────────────────────────────────────────────────────────
function ShiftBar({ shift, poste, onClick, onContextMenu, disabled, hasConflict, laneIndex }: {
  shift: Shift
  poste: Poste | null | undefined
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  disabled: boolean
  hasConflict: boolean
  laneIndex: number
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `shift-${shift.id}`,
    disabled,
  })

  const { left, width } = shiftBarStyle(shift.start_time, shift.end_time)
  const bg = poste ? `${poste.color}25` : 'var(--accent-light)'
  const border = poste?.color ?? 'var(--accent)'
  const color = poste?.color ?? 'var(--accent)'
  const hours = calcHours(shift.start_time, shift.end_time, shift.break_minutes)

  return (
    <div
      ref={setNodeRef}
      {...(disabled ? {} : { ...listeners, ...attributes })}
      onClick={e => { e.stopPropagation(); onClick() }}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onContextMenu(e) }}
      style={{
        position: 'absolute',
        left, width,
        top: `${4 + laneIndex * 34}px`,
        height: '28px',
        backgroundColor: bg,
        border: `0.5px solid ${border}`,
        borderRadius: '6px',
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '0 7px',
        cursor: disabled ? 'pointer' : 'grab',
        opacity: isDragging ? 0.35 : 1,
        transform: CSS.Translate.toString(transform),
        overflow: 'hidden',
        zIndex: 2,
        transition: 'opacity 150ms, box-shadow 150ms',
        boxShadow: isDragging ? 'none' : undefined,
        userSelect: 'none',
      }}
      className="hover:brightness-95"
    >
      {hasConflict && <AlertTriangle size={9} style={{ color: 'var(--warning)', flexShrink: 0 }} />}
      <span style={{ fontSize: '11px', fontWeight: 700, color, whiteSpace: 'nowrap' }}>
        {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
      </span>
      {shift.position && (
        <span style={{ fontSize: '10px', color, opacity: 0.65, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
          {shift.position}
        </span>
      )}
      <span style={{ fontSize: '10px', color, opacity: 0.55, marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>
        {formatHours(hours)}
      </span>
    </div>
  )
}

// ── Droppable day cell ─────────────────────────────────────────────────────────
function DayCell({ droppableId, shifts, leaveType, employee, postes, weekLocked, laneCount, onAdd, onClickShift, onContextMenu }: {
  droppableId: string
  shifts: Shift[]
  leaveType: LeaveType | undefined
  employee: Profile
  postes: Map<string, Poste>
  weekLocked: boolean
  laneCount: number
  onAdd: () => void
  onClickShift: (s: Shift) => void
  onContextMenu: (e: React.MouseEvent, s: Shift) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })
  const [hov, setHov] = useState(false)
  const cellH = Math.max(40, laneCount * 34 + 8)

  return (
    <td
      ref={setNodeRef}
      onClick={weekLocked || shifts.length > 0 ? undefined : onAdd}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        borderBottom: '0.5px solid var(--border)',
        borderRight: '0.5px solid var(--border)',
        height: `${cellH}px`,
        minWidth: '120px',
        padding: 0,
        verticalAlign: 'top',
        overflow: 'visible',
        cursor: !weekLocked && shifts.length === 0 ? 'pointer' : 'default',
        backgroundColor: isOver && !weekLocked
          ? 'var(--accent-light)'
          : leaveType
          ? `${LEAVE_STYLES[leaveType].bg}55`
          : hov && !weekLocked && shifts.length === 0
          ? 'var(--bg-page)'
          : 'transparent',
        transition: 'background-color 120ms ease',
      }}
    >
      {/* Subtle time guides at 6h / 12h / 18h */}
      {[6, 12, 18].map(h => (
        <div key={h} style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${(h / 24) * 100}%`, width: '0.5px',
          backgroundColor: 'var(--border)', opacity: 0.6,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Leave stripe */}
      {leaveType && (
        <div style={{
          position: 'absolute', top: 4, left: 6,
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.03em',
          padding: '2px 5px', borderRadius: '4px', zIndex: 1,
          backgroundColor: LEAVE_STYLES[leaveType].bg,
          color: LEAVE_STYLES[leaveType].color,
          border: `0.5px solid ${LEAVE_STYLES[leaveType].color}`,
          pointerEvents: 'none',
        }}>
          {LEAVE_STYLES[leaveType].label}
        </div>
      )}

      {/* Add hint when empty and hovered */}
      {!weekLocked && shifts.length === 0 && hov && !leaveType && (
        <div style={{
          position: 'absolute', inset: '3px', borderRadius: '6px',
          border: '0.5px dashed var(--accent)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <Plus size={11} style={{ color: 'var(--accent)', opacity: 0.6 }} />
        </div>
      )}

      {/* Shift bars */}
      {shifts.map((shift, idx) => (
        <ShiftBar
          key={shift.id}
          shift={shift}
          poste={shift.poste_id ? postes.get(shift.poste_id) : null}
          onClick={() => onClickShift(shift)}
          onContextMenu={(e) => onContextMenu(e, shift)}
          disabled={weekLocked}
          hasConflict={!!leaveType}
          laneIndex={idx}
        />
      ))}
    </td>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export interface PlanningWeekTimelineProps {
  weekDates: Date[]
  employees: Profile[]
  shifts: Shift[]
  leaveRequests: LeaveRequest[]
  weekLocked: boolean
  weekPublished: boolean
  postes: Poste[]
}

export function PlanningWeekTimeline({
  weekDates, employees, shifts, leaveRequests, weekLocked, weekPublished, postes,
}: PlanningWeekTimelineProps) {
  const router = useRouter()
  const mondayStr = toISODate(weekDates[0])
  const prevMonday = toISODate(addDays(weekDates[0], -7))
  const nextMonday = toISODate(addDays(weekDates[0], 7))
  const weekLabel = getWeekLabel(weekDates)
  const posteMap = new Map<string, Poste>(postes.map(p => [p.id, p]))

  const [modal, setModal] = useState<ModalState>({ type: 'closed' })
  const [ctx, setCtx] = useState<CtxMenu | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [copyLoading, setCopyLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [filterPoste, setFilterPoste] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // ── Data maps ────────────────────────────────────────────────────────────────
  const shiftMap = new Map<string, Shift[]>()
  for (const s of shifts) {
    const key = `${s.employee_id}__${s.date}`
    const arr = shiftMap.get(key) ?? []
    arr.push(s)
    shiftMap.set(key, arr)
  }

  const absMap = new Map<string, LeaveType>()
  for (const req of leaveRequests) {
    for (
      let d = new Date(req.start_date + 'T00:00:00');
      d <= new Date(req.end_date + 'T00:00:00');
      d.setDate(d.getDate() + 1)
    ) {
      absMap.set(`${req.employee_id}__${toISODate(d)}`, req.type)
    }
  }

  const positions = Array.from(new Set(employees.map(e => e.position).filter(Boolean) as string[])).sort()
  const filteredEmps = filterPoste ? employees.filter(e => e.position === filterPoste) : employees
  const activeDragShift = activeDragId ? shifts.find(s => `shift-${s.id}` === activeDragId) : null

  // ── Handlers ─────────────────────────────────────────────────────────────────
  async function handleWeekStatus(payload: { published?: boolean; locked?: boolean }) {
    setStatusLoading(true)
    try {
      await fetch('/api/week-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_monday: mondayStr, ...payload }),
      })
      router.refresh()
    } finally { setStatusLoading(false) }
  }

  async function handleCopyWeek() {
    setCopyLoading(true)
    try {
      const res = await fetch('/api/shifts/copy-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_monday: mondayStr }),
      })
      if (!res.ok) throw new Error()
      router.push(`?week=${nextMonday}`)
    } finally { setCopyLoading(false) }
  }

  async function handleResendEmails() {
    setEmailLoading(true)
    try {
      const res = await fetch('/api/shifts/send-planning-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_monday: mondayStr }),
      })
      const data = await res.json()
      setEmailFeedback(`✓ ${data.sent} email${data.sent !== 1 ? 's' : ''} envoyé${data.sent !== 1 ? 's' : ''}`)
      setTimeout(() => setEmailFeedback(null), 4000)
    } finally { setEmailLoading(false) }
  }

  async function copyShift(shift: Shift, targetEmployeeId: string, targetDate: string) {
    await fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: targetEmployeeId,
        date: targetDate,
        start_time: shift.start_time,
        end_time: shift.end_time,
        break_minutes: shift.break_minutes,
        position: shift.position,
        poste_id: shift.poste_id ?? null,
      }),
    })
    router.refresh()
  }

  async function deleteShift(shiftId: string) {
    await fetch(`/api/shifts/${shiftId}`, { method: 'DELETE' })
    router.refresh()
    setCtx(null)
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveDragId(String(e.active.id))
    setCtx(null)
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveDragId(null)
    const { active, over } = e
    if (!over) return
    const shiftId = String(active.id).replace('shift-', '')
    const [targetEmpId, targetDate] = String(over.id).split('__')
    const shift = shifts.find(s => s.id === shiftId)
    if (!shift || (shift.employee_id === targetEmpId && shift.date === targetDate)) return
    await copyShift(shift, targetEmpId, targetDate)
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4" onClick={() => setCtx(null)}>

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Left: view toggle + prev */}
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden text-[13px]" style={{ border: '0.5px solid var(--border)', borderRadius: '8px' }}>
              <Link href={`/manager/planning?view=day&date=${toISODate(new Date())}`} className="px-3 py-1.5 transition-colors" style={{ color: 'var(--text-tertiary)', borderRight: '0.5px solid var(--border)' }}>Jour</Link>
              <div className="px-3 py-1.5 select-none" style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-card)' }}>Semaine</div>
              <Link href="/manager/planning?view=month" className="px-3 py-1.5 transition-colors" style={{ color: 'var(--text-tertiary)', borderLeft: '0.5px solid var(--border)' }}>Mois</Link>
            </div>
            <Link href={`?week=${prevMonday}`}>
              <button className="btn-secondary flex items-center gap-1"><ChevronLeft className="h-3.5 w-3.5" />Préc.</button>
            </Link>
          </div>

          {/* Center: label + controls */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>{weekLabel}</span>

            {/* Position filter */}
            {positions.length > 0 && (
              <label className="flex items-center gap-1.5">
                <Filter className="h-3 w-3" style={{ color: 'var(--text-tertiary)' }} />
                <select value={filterPoste} onChange={e => setFilterPoste(e.target.value)} className="dp-input py-1 text-[12px]" style={{ width: 'auto' }}>
                  <option value="">Tous les postes</option>
                  {positions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            )}

            {/* Publish toggle */}
            <button
              role="switch" aria-checked={weekPublished}
              onClick={() => handleWeekStatus({ published: !weekPublished })}
              disabled={statusLoading}
              className="relative inline-flex h-7 w-[110px] cursor-pointer items-center rounded-full transition-colors duration-200 disabled:opacity-50"
              style={{ backgroundColor: weekPublished ? 'var(--success)' : 'var(--bg-card)', border: `0.5px solid ${weekPublished ? 'var(--success)' : 'var(--border)'}` }}
            >
              <span className="absolute h-5 w-5 rounded-full transition-transform duration-200" style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 0 0 0.5px var(--border)', transform: weekPublished ? 'translateX(84px)' : 'translateX(4px)' }} />
              <span className="absolute inset-0 flex items-center" style={{ opacity: weekPublished ? 1 : 0, transition: 'opacity 150ms' }}>
                <span className="pl-3 text-[11px] font-medium text-white">Publié</span>
              </span>
              <span className="absolute inset-0 flex items-center justify-end" style={{ opacity: weekPublished ? 0 : 1, transition: 'opacity 150ms' }}>
                <span className="pr-3 text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Non-publié</span>
              </span>
            </button>

            <button className="btn-secondary flex items-center gap-1.5" style={weekLocked ? { borderColor: 'var(--warning)', color: 'var(--warning)' } : {}} onClick={() => handleWeekStatus({ locked: !weekLocked })} disabled={statusLoading}>
              {weekLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              {weekLocked ? 'Verrouillé' : 'Verrouiller'}
            </button>

            <button className="btn-secondary flex items-center gap-1.5" onClick={handleCopyWeek} disabled={copyLoading || employees.length === 0}>
              <Copy className="h-3.5 w-3.5" />
              {copyLoading ? 'Copie...' : 'Copier →'}
            </button>

            <button className="btn-secondary flex items-center gap-1.5" onClick={handleResendEmails} disabled={emailLoading || employees.length === 0}>
              <Mail className="h-3.5 w-3.5" />
              {emailLoading ? 'Envoi...' : 'Envoyer'}
            </button>

            <button className="btn-secondary flex items-center gap-1.5" onClick={() => { navigator.clipboard.writeText(window.location.href); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) }}>
              {shareCopied ? <Check className="h-3.5 w-3.5" style={{ color: 'var(--success)' }} /> : <Share2 className="h-3.5 w-3.5" />}
              {shareCopied ? 'Copié !' : 'Partager'}
            </button>

            <Link href={`/manager/planning/print?week=${mondayStr}`} target="_blank">
              <button className="btn-secondary flex items-center gap-1.5"><Printer className="h-3.5 w-3.5" />PDF</button>
            </Link>

            {emailFeedback && (
              <span className="text-[12px]" style={{ color: emailFeedback.startsWith('✓') ? 'var(--success)' : 'var(--danger)' }}>{emailFeedback}</span>
            )}
          </div>

          {/* Right: next */}
          <Link href={`?week=${nextMonday}`}>
            <button className="btn-secondary flex items-center gap-1">Suiv.<ChevronRight className="h-3.5 w-3.5" /></button>
          </Link>
        </div>

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {employees.length === 0 ? (
          <div className="rounded-xl p-12 text-center" style={{ border: '0.5px dashed var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <p className="text-[13px] mb-3" style={{ color: 'var(--text-secondary)' }}>Ajoutez des employés pour commencer à planifier</p>
            <Link href="/manager/employees"><button className="btn-secondary">Gérer les employés</button></Link>
          </div>
        ) : (
          /* ── Timeline grid ─────────────────────────────────────────────── */
          <div style={{
            borderRadius: '12px',
            border: '0.5px solid var(--border)',
            backgroundColor: 'var(--bg-card)',
            overflow: 'hidden',
            opacity: weekLocked ? 0.72 : 1,
            filter: weekLocked ? 'saturate(0.45)' : 'none',
            transition: 'opacity 300ms, filter 300ms',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '152px' }} />
                  {weekDates.map(d => <col key={toISODate(d)} />)}
                  <col style={{ width: '52px' }} />
                </colgroup>

                {/* ── Header ──────────────────────────────────────────────── */}
                <thead>
                  <tr>
                    {/* Corner cell */}
                    <th style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)', padding: '10px 14px', textAlign: 'left', verticalAlign: 'bottom' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>Équipe</span>
                    </th>

                    {weekDates.map(date => {
                      const today = isToday(date)
                      const dateStr = toISODate(date)
                      const count = shifts.filter(s => s.date === dateStr).length
                      return (
                        <th key={dateStr} style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', backgroundColor: today ? 'var(--accent-light)' : 'var(--bg-page)', padding: '8px 0 0', textAlign: 'left', verticalAlign: 'bottom' }}>
                          {/* Day label */}
                          <div style={{ padding: '0 10px 5px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: today ? 'var(--accent)' : 'var(--text-primary)', textTransform: 'capitalize' }}>
                              {date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')} {date.getDate()}
                            </span>
                            {count > 0 && (
                              <span style={{ marginLeft: 5, fontSize: '10px', color: today ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                                {count} shift{count > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {/* Time ruler */}
                          <div style={{ position: 'relative', height: '18px', borderTop: '0.5px solid var(--border)' }}>
                            {TICK_HOURS.map(h => (
                              <div key={h} style={{
                                position: 'absolute',
                                left: `${(h / 24) * 100}%`,
                                top: 0,
                                transform: h === 24 ? 'translateX(-100%)' : h === 0 ? 'none' : 'translateX(-50%)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                              }}>
                                <div style={{ width: '0.5px', height: '4px', backgroundColor: today ? 'var(--accent)' : 'var(--border)' }} />
                                <span style={{ fontSize: '8px', color: today ? 'var(--accent)' : 'var(--text-tertiary)', marginTop: '1px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                                  {h < 24 ? `${h}h` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </th>
                      )
                    })}

                    {/* Total header */}
                    <th style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)', padding: '10px 8px', textAlign: 'center', verticalAlign: 'bottom' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>h/sem</span>
                    </th>
                  </tr>
                </thead>

                {/* ── Employee rows ────────────────────────────────────────── */}
                <tbody>
                  {filteredEmps.map(emp => {
                    const weekTotal = weekDates.reduce((sum, date) => {
                      const ds = shiftMap.get(`${emp.id}__${toISODate(date)}`) ?? []
                      return sum + ds.reduce((s, sh) => s + calcHours(sh.start_time, sh.end_time, sh.break_minutes), 0)
                    }, 0)
                    const maxLanes = Math.max(1, ...weekDates.map(d => (shiftMap.get(`${emp.id}__${toISODate(d)}`) ?? []).length))

                    return (
                      <tr key={emp.id}>
                        {/* Employee info */}
                        <td style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', padding: '10px 12px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)' }}>{getInitials(emp.full_name)}</span>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {emp.full_name ?? emp.email}
                              </p>
                              {emp.position && (
                                <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{emp.position}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Day cells */}
                        {weekDates.map(date => {
                          const dateStr = toISODate(date)
                          const did = `${emp.id}__${dateStr}`
                          const dayShifts = shiftMap.get(did) ?? []
                          const leaveType = absMap.get(did)
                          return (
                            <DayCell
                              key={dateStr}
                              droppableId={did}
                              shifts={dayShifts}
                              leaveType={leaveType}
                              employee={emp}
                              postes={posteMap}
                              weekLocked={weekLocked}
                              laneCount={maxLanes}
                              onAdd={() => !weekLocked && setModal({ type: 'create', employee: emp, date })}
                              onClickShift={s => setModal({ type: 'view', shift: s, employee: emp, date, readOnly: weekLocked })}
                              onContextMenu={(e, s) => setCtx({ x: e.clientX, y: e.clientY, shift: s, employee: emp, date })}
                            />
                          )
                        })}

                        {/* Weekly total */}
                        <td style={{ borderBottom: '0.5px solid var(--border)', padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                          {weekTotal > 0
                            ? <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{formatHours(weekTotal)}</span>
                            : <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>—</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>

                {/* ── Footer: daily totals ─────────────────────────────────── */}
                <tfoot>
                  <tr>
                    <td style={{ borderTop: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)', padding: '8px 14px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>Total / jour</span>
                    </td>
                    {weekDates.map(date => {
                      const dateStr = toISODate(date)
                      const total = shifts.filter(s => s.date === dateStr).reduce((sum, s) => sum + calcHours(s.start_time, s.end_time, s.break_minutes), 0)
                      const today = isToday(date)
                      return (
                        <td key={dateStr} style={{ borderTop: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', backgroundColor: today ? 'var(--accent-light)' : 'var(--bg-page)', padding: '8px', textAlign: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: total > 0 ? (today ? 'var(--accent)' : 'var(--text-primary)') : 'var(--text-tertiary)' }}>
                            {total > 0 ? formatHours(total) : '—'}
                          </span>
                        </td>
                      )
                    })}
                    <td style={{ borderTop: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)', padding: '8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatHours(shifts.reduce((sum, s) => sum + calcHours(s.start_time, s.end_time, s.break_minutes), 0))}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Context menu ──────────────────────────────────────────────────── */}
      {ctx && (
        <ContextMenu
          menu={ctx}
          weekDates={weekDates}
          onEdit={() => { setModal({ type: 'view', shift: ctx.shift, employee: ctx.employee, date: ctx.date, readOnly: false }); setCtx(null) }}
          onDelete={() => deleteShift(ctx.shift.id)}
          onCopyTo={date => { copyShift(ctx.shift, ctx.shift.employee_id, toISODate(date)); setCtx(null) }}
          onClose={() => setCtx(null)}
        />
      )}

      {/* ── Shift modal ────────────────────────────────────────────────────── */}
      <ShiftModal
        modalState={modal}
        onClose={() => setModal({ type: 'closed' })}
        postes={postes}
        employees={employees}
        weekDates={weekDates}
      />

      {/* ── Drag overlay ───────────────────────────────────────────────────── */}
      <DragOverlay>
        {activeDragShift ? (
          <div style={{
            height: '28px', borderRadius: '6px', padding: '0 10px',
            border: '0.5px solid var(--accent)', backgroundColor: 'var(--accent-light)',
            color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', fontWeight: 700, cursor: 'grabbing',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}>
            <CopyPlus size={12} />
            {formatTime(activeDragShift.start_time)}–{formatTime(activeDragShift.end_time)}
            <span style={{ fontSize: '10px', opacity: 0.6 }}>copier</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
