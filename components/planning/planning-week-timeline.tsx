'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Copy, Lock, Unlock,
  Mail, Share2, Check, Plus, AlertTriangle, Filter,
  Edit2, Trash2, CopyPlus, Printer,
  Calendar, ChevronDown, SlidersHorizontal,
  Users, UserCheck, Clock, TrendingUp, MoreHorizontal, Sparkles,
} from 'lucide-react'
import { type Profile, type Shift, type Poste, type LeaveRequest, type LeaveType } from '@/types'
import { getWeekLabel, toISODate, addDays } from '@/lib/utils/dates'
import { ShiftModal, type ModalState } from '@/components/planning/shift-modal'
import { AiPlanModal } from '@/components/planning/ai-plan-modal'
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

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({
  icon, iconBg, iconColor, value, label, trend,
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  value: string
  label: string
  trend?: 'up' | 'down' | null
}) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: '0.5px solid var(--border)',
      borderRadius: '12px',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      flex: 1,
      minWidth: 0,
      position: 'relative',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        backgroundColor: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        color: iconColor,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '24px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
          {value}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'nowrap' }}>
          {label}
        </p>
      </div>
      {trend && (
        <div style={{ position: 'absolute', top: '12px', right: '14px' }}>
          <TrendingUp size={14} style={{ color: trend === 'up' ? 'var(--success)' : 'var(--danger)', opacity: 0.7 }} />
        </div>
      )}
    </div>
  )
}

// ── Absence badge ──────────────────────────────────────────────────────────────
function AbsenceBadge({ type }: { type: LeaveType }) {
  const s = LEAVE_STYLES[type]
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      backgroundColor: s.bg, color: s.color,
      border: `0.5px solid ${s.color}`,
      borderRadius: '6px', fontSize: '11px', fontWeight: 500,
      padding: '2px 7px', marginBottom: '6px',
    }}>
      {s.label}
    </div>
  )
}

// ── Shift card (draggable) ────────────────────────────────────────────────────
function ShiftCard({ shift, poste, onClick, onContextMenu, disabled, hasConflict }: {
  shift: Shift
  poste: Poste | null | undefined
  onClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  disabled: boolean
  hasConflict: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `shift-${shift.id}`,
    disabled,
  })

  const bg = poste ? `${poste.color}15` : 'var(--accent-light)'
  const borderColor = poste?.color ?? 'var(--accent)'
  const textColor = poste?.color ?? 'var(--accent)'

  return (
    <div
      ref={setNodeRef}
      {...(disabled ? {} : { ...listeners, ...attributes })}
      onClick={e => { e.stopPropagation(); onClick() }}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onContextMenu(e) }}
      style={{
        backgroundColor: bg,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '8px 10px',
        minHeight: '52px',
        cursor: disabled ? 'pointer' : 'grab',
        opacity: isDragging ? 0.35 : 1,
        transform: CSS.Translate.toString(transform),
        transition: 'opacity 150ms, filter 150ms',
        userSelect: 'none',
        marginBottom: '4px',
      }}
      className="hover:brightness-[0.96]"
    >
      {hasConflict && <AlertTriangle size={10} style={{ color: 'var(--warning)', marginBottom: '3px', display: 'block' }} />}
      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>
        {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
      </p>
      {shift.position && (
        <p style={{ fontSize: '12px', color: textColor, marginTop: '3px', lineHeight: 1 }}>
          {shift.position}
        </p>
      )}
    </div>
  )
}

// ── Droppable grid cell ────────────────────────────────────────────────────────
function GridCell({ droppableId, shifts, leaveType, postes, weekLocked, onAdd, onClickShift, onContextMenu, isToday: isTodayCol }: {
  droppableId: string
  shifts: Shift[]
  leaveType: LeaveType | undefined
  postes: Map<string, Poste>
  weekLocked: boolean
  onAdd: () => void
  onClickShift: (s: Shift) => void
  onContextMenu: (e: React.MouseEvent, s: Shift) => void
  isToday: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })
  const [hov, setHov] = useState(false)
  const isEmpty = shifts.length === 0 && !leaveType

  return (
    <td
      ref={setNodeRef}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderBottom: '0.5px solid var(--border)',
        borderRight: '0.5px solid var(--border)',
        padding: '8px',
        verticalAlign: 'top',
        backgroundColor: isOver && !weekLocked
          ? 'var(--accent-light)'
          : isTodayCol
          ? 'rgba(45,58,140,0.04)'
          : 'transparent',
        transition: 'background-color 120ms ease',
        minWidth: '120px',
      }}
    >
      {/* Absence badge */}
      {leaveType && <AbsenceBadge type={leaveType} />}

      {/* Shift cards */}
      {shifts.map(shift => (
        <ShiftCard
          key={shift.id}
          shift={shift}
          poste={shift.poste_id ? postes.get(shift.poste_id) : null}
          onClick={() => onClickShift(shift)}
          onContextMenu={(e) => onContextMenu(e, shift)}
          disabled={weekLocked}
          hasConflict={!!leaveType && shifts.length > 0}
        />
      ))}

      {/* Empty cell */}
      {isEmpty && !weekLocked && (
        <div
          onClick={onAdd}
          style={{
            minHeight: '52px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', borderRadius: '6px',
            border: hov ? '0.5px dashed var(--accent)' : '0.5px solid transparent',
            backgroundColor: hov ? 'var(--accent-light)' : 'transparent',
            transition: 'all 120ms ease',
          }}
        >
          {hov
            ? <Plus size={14} style={{ color: 'var(--accent)', opacity: 0.7 }} />
            : <span style={{ color: 'var(--border)', fontSize: '16px', fontWeight: 300 }}>—</span>
          }
        </div>
      )}

      {isEmpty && weekLocked && (
        <div style={{ minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--border)', fontSize: '16px', fontWeight: 300 }}>—</span>
        </div>
      )}

      {/* Add more button when shifts exist */}
      {shifts.length > 0 && !weekLocked && (
        <div
          onClick={onAdd}
          style={{
            marginTop: '2px', height: '22px', borderRadius: '5px',
            border: '0.5px dashed var(--border)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            transition: 'all 120ms ease',
          }}
          className="hover:border-[var(--accent)] hover:bg-[var(--accent-light)]"
        >
          <Plus size={10} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      )}
    </td>
  )
}

// ── Donut chart (SVG natif) ───────────────────────────────────────────────────
function DonutChart({ shifts, postes }: { shifts: Shift[]; postes: Poste[] }) {
  const posteMap = new Map(postes.map(p => [p.id, p]))
  const hoursPerPoste = new Map<string, number>()
  let totalH = 0

  for (const s of shifts) {
    const h = calcHours(s.start_time, s.end_time, s.break_minutes)
    const key = s.poste_id ?? '__none__'
    hoursPerPoste.set(key, (hoursPerPoste.get(key) ?? 0) + h)
    totalH += h
  }

  if (totalH === 0) return null

  const entries = Array.from(hoursPerPoste.entries()).map(([id, h]) => ({
    id,
    poste: posteMap.get(id),
    hours: h,
    pct: Math.round((h / totalH) * 100),
  })).sort((a, b) => b.hours - a.hours)

  const r = 48, cx = 60, cy = 60, stroke = 18
  let cumAngle = -Math.PI / 2

  const arcs = entries.map(e => {
    const angle = (e.hours / totalH) * 2 * Math.PI
    const x1 = cx + r * Math.cos(cumAngle)
    const y1 = cy + r * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = cx + r * Math.cos(cumAngle)
    const y2 = cy + r * Math.sin(cumAngle)
    const large = angle > Math.PI ? 1 : 0
    return { ...e, d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, color: e.poste?.color ?? 'var(--border)' }
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
        {arcs.map((arc, i) => (
          <path
            key={i}
            d={arc.d}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
          />
        ))}
        <text x="60" y="56" textAnchor="middle" style={{ fontSize: '14px', fontWeight: 600, fill: 'var(--text-primary)' }}>{formatHours(totalH)}</text>
        <text x="60" y="70" textAnchor="middle" style={{ fontSize: '9px', fill: 'var(--text-tertiary)' }}>Total planif.</text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {entries.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: e.poste?.color ?? 'var(--border)', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.poste?.name ?? 'Sans poste'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, flexShrink: 0 }}>
              {formatHours(e.hours)}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0, width: '30px', textAlign: 'right' }}>
              {e.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Alert row ─────────────────────────────────────────────────────────────────
function AlertRow({ iconBg, iconColor, icon, title, desc, badge }: {
  iconBg: string; iconColor: string; icon: React.ReactNode
  title: string; desc: string
  badge: { label: string; color: string; bg: string }
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{title}</p>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>{desc}</p>
      </div>
      <div style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: badge.bg, color: badge.color, fontSize: '11px', fontWeight: 500, flexShrink: 0 }}>
        {badge.label}
      </div>
    </div>
  )
}

// ── Activity row ──────────────────────────────────────────────────────────────
function ActivityRow({ iconBg, iconColor, icon, desc, sub }: {
  iconBg: string; iconColor: string; icon: React.ReactNode
  desc: string; sub: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
      <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{desc}</p>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px' }}>{sub}</p>
      </div>
    </div>
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
  const [showAiPlanModal, setShowAiPlanModal] = useState(false)

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

  // ── Metric computations ────────────────────────────────────────────────────
  const totalPlanned = shifts.reduce((sum, s) => sum + calcHours(s.start_time, s.end_time, s.break_minutes), 0)
  const employeesWithShift = new Set(shifts.map(s => s.employee_id)).size
  const coverage = employees.length > 0 ? Math.round((employeesWithShift / employees.length) * 100) : 0
  const hasWeeklyHours = employees.some(e => e.weekly_hours != null)
  const overtime = hasWeeklyHours
    ? Math.max(0, totalPlanned - employees.reduce((sum, e) => sum + (e.weekly_hours ?? 35), 0))
    : null

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>

          {/* Left: nav + dates */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Link href={`?week=${prevMonday}`}>
              <button className="btn-secondary" style={{ padding: '7px 9px' }} aria-label="Semaine précédente">
                <ChevronLeft size={14} />
              </button>
            </Link>
            <Link href="/manager/planning">
              <button className="btn-secondary" style={{ fontSize: '13px', padding: '7px 12px' }}>{"Aujourd'hui"}</button>
            </Link>
            <Calendar size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{weekLabel}</span>
              <ChevronDown size={13} style={{ color: 'var(--text-tertiary)' }} />
            </div>
          </div>

          {/* Center: Jour / Semaine / Mois pills */}
          <div style={{ display: 'flex', border: '0.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden', fontSize: '13px' }}>
            <Link href={`/manager/planning?view=day&date=${toISODate(new Date())}`}>
              <div style={{ padding: '6px 14px', color: 'var(--text-tertiary)', cursor: 'pointer', transition: 'color 150ms' }}
                className="hover:text-[var(--text-primary)]">Jour</div>
            </Link>
            <div style={{ padding: '6px 14px', backgroundColor: 'var(--accent)', color: '#FFFFFF', userSelect: 'none', borderLeft: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)' }}>
              Semaine
            </div>
            <Link href="/manager/planning?view=month">
              <div style={{ padding: '6px 14px', color: 'var(--text-tertiary)', cursor: 'pointer', transition: 'color 150ms' }}
                className="hover:text-[var(--text-primary)]">Mois</div>
            </Link>
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>

            {/* Position filter */}
            {positions.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={13} style={{ color: 'var(--text-secondary)' }} />
                <select value={filterPoste} onChange={e => setFilterPoste(e.target.value)} className="dp-input py-1 text-[12px]" style={{ width: 'auto' }}>
                  <option value="">Tous les postes</option>
                  {positions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            )}

            {/* Filtres button */}
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <SlidersHorizontal size={13} />
              Filtres
            </button>

            {/* Secondary icon-only actions */}
            <button
              className="btn-secondary"
              style={{ padding: '7px 9px', ...(weekLocked ? { borderColor: 'var(--warning)', color: 'var(--warning)' } : {}) }}
              onClick={() => handleWeekStatus({ locked: !weekLocked })}
              disabled={statusLoading}
              title={weekLocked ? 'Déverrouiller' : 'Verrouiller'}
            >
              {weekLocked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>

            <button className="btn-secondary" style={{ padding: '7px 9px' }} onClick={handleCopyWeek} disabled={copyLoading || employees.length === 0} title="Copier vers semaine suivante">
              <Copy size={13} />
            </button>

            <button className="btn-secondary" style={{ padding: '7px 9px' }} onClick={handleResendEmails} disabled={emailLoading || employees.length === 0} title="Envoyer par email">
              <Mail size={13} />
            </button>

            <button className="btn-secondary" style={{ padding: '7px 9px' }} onClick={() => { navigator.clipboard.writeText(window.location.href); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) }} title="Partager">
              {shareCopied ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Share2 size={13} />}
            </button>

            <Link href={`/manager/planning/print?week=${mondayStr}`} target="_blank">
              <button className="btn-secondary" style={{ padding: '7px 9px' }} title="Exporter PDF"><Printer size={13} /></button>
            </Link>

            {/* Générer avec l'IA */}
            <button
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', borderColor: 'var(--accent)', color: 'var(--accent)' }}
              onClick={() => setShowAiPlanModal(true)}
              title="Générer le planning automatiquement avec l'IA"
            >
              <Sparkles size={13} />
              Générer
            </button>

            {/* Publier — primary CTA */}
            <button
              className="btn-primary"
              onClick={() => handleWeekStatus({ published: !weekPublished })}
              disabled={statusLoading || employees.length === 0}
              style={{ paddingLeft: '18px', paddingRight: '18px', gap: '6px', opacity: statusLoading ? 0.6 : 1 }}
            >
              {weekPublished ? <><Check size={13} />Publié</> : 'Publier'}
            </button>

            {emailFeedback && (
              <span style={{ fontSize: '12px', color: emailFeedback.startsWith('✓') ? 'var(--success)' : 'var(--danger)' }}>{emailFeedback}</span>
            )}
          </div>
        </div>

        {/* ── Metric cards ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <MetricCard
            icon={<Users size={18} />}
            iconBg="var(--accent-light)"
            iconColor="var(--accent)"
            value={totalPlanned > 0 ? formatHours(totalPlanned) : '0h'}
            label="Total planifiées"
            trend={totalPlanned > 0 ? 'up' : null}
          />
          <MetricCard
            icon={<UserCheck size={18} />}
            iconBg="#FFF7ED"
            iconColor="#EA580C"
            value="—"
            label="Total travaillées"
            trend={null}
          />
          <MetricCard
            icon={<Clock size={18} />}
            iconBg="#F5F5F5"
            iconColor="var(--text-secondary)"
            value={overtime != null ? formatHours(overtime) : '—'}
            label="Heures supp."
            trend={overtime != null && overtime > 0 ? 'up' : null}
          />
          <MetricCard
            icon={<Clock size={18} />}
            iconBg="#F5F3FF"
            iconColor="#7C3AED"
            value={employees.length > 0 ? `${coverage}%` : '—'}
            label="Couverture"
            trend={coverage >= 80 ? 'up' : coverage > 0 ? 'down' : null}
          />
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
                  <col style={{ width: '200px' }} />
                  {weekDates.map(d => <col key={toISODate(d)} />)}
                  <col style={{ width: '64px' }} />
                </colgroup>

                {/* ── Header ──────────────────────────────────────────────── */}
                <thead>
                  <tr>
                    {/* Employés corner */}
                    <th style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)', padding: '12px 16px', textAlign: 'left', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Employés</span>
                        <SlidersHorizontal size={11} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} />
                      </div>
                    </th>

                    {weekDates.map(date => {
                      const today = isToday(date)
                      const dateStr = toISODate(date)
                      const count = shifts.filter(s => s.date === dateStr).length
                      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')
                      const dayNum = date.getDate()
                      return (
                        <th key={dateStr} style={{
                          borderBottom: '0.5px solid var(--border)',
                          borderRight: '0.5px solid var(--border)',
                          backgroundColor: 'var(--bg-page)',
                          padding: '12px 8px',
                          textAlign: 'center',
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'capitalize', fontWeight: 400 }}>
                              {dayName}.
                            </span>
                            {today ? (
                              <div style={{
                                width: '28px', height: '28px', borderRadius: '50%',
                                backgroundColor: 'var(--accent)', color: '#FFFFFF',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '13px', fontWeight: 600,
                              }}>
                                {dayNum}
                              </div>
                            ) : (
                              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', width: '28px', textAlign: 'center', lineHeight: '28px' }}>
                                {dayNum}
                              </span>
                            )}
                            {count > 0 && (
                              <span style={{ fontSize: '10px', color: today ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                                {count} shift{count > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </th>
                      )
                    })}

                    {/* H/sem header */}
                    <th style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)', padding: '12px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>H/sem</span>
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

                    return (
                      <tr key={emp.id}>
                        {/* Employee cell */}
                        <td style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>{getInitials(emp.full_name)}</span>
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                                {emp.full_name ?? emp.email}
                              </p>
                              {emp.position && (
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px', lineHeight: 1 }}>{emp.position}</p>
                              )}
                            </div>
                            {weekTotal > 0 && (
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                {formatHours(weekTotal)} / sem.
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Day cells */}
                        {weekDates.map(date => {
                          const dateStr = toISODate(date)
                          const did = `${emp.id}__${dateStr}`
                          const dayShifts = shiftMap.get(did) ?? []
                          const leaveType = absMap.get(did)
                          const todayCol = isToday(date)
                          return (
                            <GridCell
                              key={dateStr}
                              droppableId={did}
                              shifts={dayShifts}
                              leaveType={leaveType}
                              postes={posteMap}
                              weekLocked={weekLocked}
                              isToday={todayCol}
                              onAdd={() => !weekLocked && setModal({ type: 'create', employee: emp, date })}
                              onClickShift={s => setModal({ type: 'view', shift: s, employee: emp, date, readOnly: weekLocked })}
                              onContextMenu={(e, s) => setCtx({ x: e.clientX, y: e.clientY, shift: s, employee: emp, date })}
                            />
                          )
                        })}

                        {/* Weekly total */}
                        <td style={{ borderBottom: '0.5px solid var(--border)', padding: '12px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                          {weekTotal > 0
                            ? <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{formatHours(weekTotal)}</span>
                            : <span style={{ fontSize: '14px', color: 'var(--border)', fontWeight: 300 }}>—</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>

                {/* ── Footer: daily totals ─────────────────────────────────── */}
                <tfoot>
                  <tr>
                    <td style={{ borderTop: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)', padding: '10px 16px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>Total / jour</span>
                    </td>
                    {weekDates.map(date => {
                      const dateStr = toISODate(date)
                      const total = shifts.filter(s => s.date === dateStr).reduce((sum, s) => sum + calcHours(s.start_time, s.end_time, s.break_minutes), 0)
                      const today = isToday(date)
                      return (
                        <td key={dateStr} style={{ borderTop: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', backgroundColor: today ? 'rgba(45,58,140,0.04)' : 'var(--bg-page)', padding: '10px 8px', textAlign: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: total > 0 ? (today ? 'var(--accent)' : 'var(--text-primary)') : 'var(--text-tertiary)' }}>
                            {total > 0 ? formatHours(total) : '—'}
                          </span>
                        </td>
                      )
                    })}
                    <td style={{ borderTop: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)', padding: '10px 8px', textAlign: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatHours(shifts.reduce((sum, s) => sum + calcHours(s.start_time, s.end_time, s.break_minutes), 0))}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── Bottom section ────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '8px' }}>

          {/* Col 1 — Aperçu par service */}
          <div className="dp-card">
            <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Aperçu par service
            </h3>
            {postes.length === 0 || shifts.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0' }}>Aucun shift planifié</p>
            ) : (
              <DonutChart shifts={shifts} postes={postes} />
            )}
          </div>

          {/* Col 2 — Alertes */}
          <div className="dp-card">
            <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Alertes
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Couverture manquante */}
              {coverage < 80 && employees.length > 0 && (
                <AlertRow
                  iconBg="#FEF3C7" iconColor="var(--warning)"
                  icon={<Clock size={14} />}
                  title="Couverture insuffisante"
                  desc={`Seulement ${coverage}% des employés ont un shift cette semaine`}
                  badge={{ label: `${100 - coverage}% manquants`, color: 'var(--warning)', bg: '#FEF3C7' }}
                />
              )}
              {/* Heures supp */}
              {overtime != null && overtime > 2 && (
                <AlertRow
                  iconBg="#FEE2E2" iconColor="var(--danger)"
                  icon={<Clock size={14} />}
                  title="Heures supplémentaires"
                  desc={`${formatHours(overtime)} d'heures au-dessus du contractuel cette semaine`}
                  badge={{ label: `+${formatHours(overtime)}`, color: 'var(--danger)', bg: '#FEE2E2' }}
                />
              )}
              {coverage >= 80 && (overtime == null || overtime <= 2) && (
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0' }}>
                  Aucune alerte active
                </p>
              )}
            </div>
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '0.5px solid var(--border)' }}>
              <a href="/manager/planning" style={{ fontSize: '13px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                Voir toutes les alertes <ChevronRight size={13} />
              </a>
            </div>
          </div>

          {/* Col 3 — Activité récente */}
          <div className="dp-card">
            <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Activité récente
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {weekPublished && (
                <ActivityRow
                  iconBg="var(--accent-light)" iconColor="var(--accent)"
                  icon={<Check size={14} />}
                  desc="Semaine publiée"
                  sub={weekLabel}
                />
              )}
              {weekPublished === false && shifts.length > 0 && (
                <ActivityRow
                  iconBg="#FEF3C7" iconColor="var(--warning)"
                  icon={<AlertTriangle size={14} />}
                  desc="Planning non publié"
                  sub={`${shifts.length} shift${shifts.length > 1 ? 's' : ''} en attente`}
                />
              )}
              {shifts.length === 0 && (
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0' }}>
                  Aucune activité récente
                </p>
              )}
            </div>
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '0.5px solid var(--border)' }}>
              <a href="/manager/planning" style={{ fontSize: '13px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                {"Voir toute l'activité"} <ChevronRight size={13} />
              </a>
            </div>
          </div>

        </div>
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
        shifts={shifts}
      />

      {/* ── AI Plan modal ──────────────────────────────────────────────────── */}
      {showAiPlanModal && (
        <AiPlanModal
          weekMonday={mondayStr}
          weekLabel={weekLabel}
          employees={employees}
          postes={postes}
          onSuccess={() => router.refresh()}
          onClose={() => setShowAiPlanModal(false)}
        />
      )}

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
