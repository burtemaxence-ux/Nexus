'use client'

import { useState } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Plus, Lock, Unlock,
  Share2, Check, Calendar, ChevronDown, SlidersHorizontal,
} from 'lucide-react'
import { type Profile, type Shift, type Poste, type LeaveRequest, type LeaveType } from '@/types'
import { toISODate, addDays } from '@/lib/utils/dates'
import { ShiftModal, type ModalState } from '@/components/planning/shift-modal'

interface PlanningDayProps {
  date: Date
  employees: Profile[]
  shifts: Shift[]
  leaveRequests: LeaveRequest[]
  weekLocked: boolean
  weekPublished: boolean
  postes: Poste[]
}

const LEAVE_LABELS: Record<LeaveType, { label: string; style: React.CSSProperties }> = {
  CP:         { label: 'Congé payé',  style: { backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '0.5px solid var(--accent)' } },
  RTT:        { label: 'RTT',         style: { backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '0.5px solid var(--accent)' } },
  maladie:    { label: 'Maladie',     style: { backgroundColor: '#FEE2E2', color: 'var(--danger)', border: '0.5px solid var(--danger)' } },
  sans_solde: { label: 'Sans solde',  style: { backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' } },
  autre:      { label: 'Absence',     style: { backgroundColor: '#FEF3C7', color: 'var(--warning)', border: '0.5px solid var(--warning)' } },
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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
  return mm > 0 ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`
}

export function PlanningDay({ date, employees, shifts, leaveRequests, weekLocked, weekPublished, postes }: PlanningDayProps) {
  const router = useRouter()
  const [planRef] = useAutoAnimate()
  const [modalState, setModalState] = useState<ModalState>({ type: 'closed' })
  const [statusLoading, setStatusLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  const dateStr = toISODate(date)
  const prevDate = addDays(date, -1)
  const nextDate = addDays(date, 1)

  const dayLabel = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const isTodayDate = toISODate(new Date()) === dateStr

  const posteMap = new Map(postes.map(p => [p.id, p]))
  const dayShiftMap = new Map<string, Shift[]>()
  for (const s of shifts) {
    const existing = dayShiftMap.get(s.employee_id) ?? []
    existing.push(s)
    dayShiftMap.set(s.employee_id, existing)
  }

  const absenceMap = new Map<string, LeaveType>()
  for (const req of leaveRequests) {
    const start = new Date(req.start_date + 'T00:00:00')
    const end = new Date(req.end_date + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (toISODate(d) === dateStr) absenceMap.set(req.employee_id, req.type)
    }
  }

  const sorted = [...employees].sort((a, b) => {
    const aShifts = dayShiftMap.get(a.id) ?? []
    const bShifts = dayShiftMap.get(b.id) ?? []
    const aAbs = absenceMap.has(a.id)
    const bAbs = absenceMap.has(b.id)
    if (aShifts.length > 0 && bShifts.length === 0) return -1
    if (bShifts.length > 0 && aShifts.length === 0) return 1
    if (aShifts.length > 0 && bShifts.length > 0) return aShifts[0].start_time.localeCompare(bShifts[0].start_time)
    if (aAbs && !bAbs) return -1
    if (bAbs && !aAbs) return 1
    return (a.full_name ?? '').localeCompare(b.full_name ?? '')
  })

  const totalDayHours = shifts.reduce((s, sh) => s + calcHours(sh.start_time, sh.end_time, sh.break_minutes), 0)

  async function handleWeekStatus(payload: { published?: boolean; locked?: boolean }) {
    setStatusLoading(true)
    try {
      const d = new Date(date)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      d.setDate(diff)
      const weekMonday = toISODate(d)
      await fetch('/api/week-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_monday: weekMonday, ...payload }),
      })
      router.refresh()
    } finally {
      setStatusLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Toolbar ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>

        {/* Left: nav + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Link href={`/manager/planning?view=day&date=${toISODate(prevDate)}`}>
            <button className="btn-secondary" style={{ padding: '7px 9px' }} aria-label="Jour précédent">
              <ChevronLeft size={14} />
            </button>
          </Link>
          <Link href={`/manager/planning?view=day&date=${toISODate(new Date())}`}>
            <button className="btn-secondary" style={{ fontSize: '13px', padding: '7px 12px' }}>{"Aujourd'hui"}</button>
          </Link>
          <Calendar size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: isTodayDate ? 'var(--accent)' : 'var(--text-primary)', textTransform: 'capitalize' }}>
              {dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}
            </span>
            {isTodayDate && (
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 500 }}>
                Aujourd&apos;hui
              </span>
            )}
            <ChevronDown size={13} style={{ color: 'var(--text-tertiary)' }} />
          </div>
        </div>

        {/* Center: Jour / Semaine / Mois pills */}
        <div style={{ display: 'flex', border: '0.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden', fontSize: '13px' }}>
          <div style={{ padding: '6px 14px', backgroundColor: 'var(--accent)', color: '#FFFFFF', userSelect: 'none' }}>
            Jour
          </div>
          <Link href={`/manager/planning?week=${dateStr}`}>
            <div style={{ padding: '6px 14px', color: 'var(--text-tertiary)', cursor: 'pointer', borderLeft: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', transition: 'color 150ms' }}
              className="hover:text-[var(--text-primary)]">Semaine</div>
          </Link>
          <Link href="/manager/planning?view=month">
            <div style={{ padding: '6px 14px', color: 'var(--text-tertiary)', cursor: 'pointer', transition: 'color 150ms' }}
              className="hover:text-[var(--text-primary)]">Mois</div>
          </Link>
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {totalDayHours > 0 && (
            <span style={{ fontSize: '12px', padding: '5px 10px', borderRadius: '20px', backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }}>
              {formatHours(totalDayHours)} planifiées
            </span>
          )}
          <button
            className="btn-secondary"
            style={{ padding: '7px 9px', ...(weekLocked ? { borderColor: 'var(--warning)', color: 'var(--warning)' } : {}) }}
            onClick={() => handleWeekStatus({ locked: !weekLocked })}
            disabled={statusLoading}
            title={weekLocked ? 'Déverrouiller' : 'Verrouiller'}
          >
            {weekLocked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
          <button
            className="btn-secondary"
            style={{ padding: '7px 9px' }}
            onClick={() => { navigator.clipboard.writeText(window.location.href); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) }}
            title="Partager"
          >
            {shareCopied ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Share2 size={13} />}
          </button>
          <button
            className="btn-primary"
            onClick={() => handleWeekStatus({ published: !weekPublished })}
            disabled={statusLoading || employees.length === 0}
            style={{ paddingLeft: '18px', paddingRight: '18px', gap: '6px', opacity: statusLoading ? 0.6 : 1 }}
          >
            {weekPublished ? <><Check size={13} />Publié</> : 'Publier'}
          </button>
        </div>
      </div>

      {/* Right nav */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Link href={`/manager/planning?view=day&date=${toISODate(nextDate)}`}>
          <button className="btn-secondary" style={{ padding: '7px 9px' }} aria-label="Jour suivant">
            <ChevronRight size={14} />
          </button>
        </Link>
      </div>

      {/* ── Employee cards ──────────────────────────────────────────────────────── */}
      {employees.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ border: '0.5px dashed var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <p className="mb-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>Ajoutez des employés pour commencer à planifier</p>
          <Link href="/manager/employees"><button className="btn-secondary">Gérer les employés</button></Link>
        </div>
      ) : (
        <div
          ref={planRef}
          style={{
            display: 'flex', flexDirection: 'column', gap: '6px',
            opacity: weekLocked ? 0.65 : 1,
            filter: weekLocked ? 'saturate(0.4)' : 'none',
            transition: 'opacity 300ms, filter 300ms',
          }}
        >
          {sorted.map(employee => {
            const empShifts = dayShiftMap.get(employee.id) ?? []
            const absenceType = absenceMap.get(employee.id)
            const hasShifts = empShifts.length > 0
            const isRest = !hasShifts && !absenceType
            const totalHours = empShifts.reduce((s, sh) => s + calcHours(sh.start_time, sh.end_time, sh.break_minutes), 0)

            return (
              <div
                key={employee.id}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '0.5px solid var(--border)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  opacity: isRest ? 0.6 : 1,
                  transition: 'opacity 150ms',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700,
                  backgroundColor: hasShifts ? 'var(--accent-light)' : absenceType ? '#FEF3C7' : 'var(--bg-page)',
                  color: hasShifts ? 'var(--accent)' : absenceType ? 'var(--warning)' : 'var(--text-tertiary)',
                }}>
                  {getInitials(employee.full_name)}
                </div>

                {/* Name + poste */}
                <div style={{ width: '160px', minWidth: '140px', flexShrink: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: isRest ? 'var(--text-tertiary)' : 'var(--text-primary)', lineHeight: 1.3 }}>
                    {employee.full_name ?? employee.email}
                  </p>
                  {employee.position && (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{employee.position}</p>
                  )}
                </div>

                {/* Shifts + absence */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {absenceType && (
                    <div style={{ ...LEAVE_LABELS[absenceType].style, borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                      {LEAVE_LABELS[absenceType].label}
                    </div>
                  )}

                  {empShifts.map(shift => {
                    const poste = shift.poste_id ? posteMap.get(shift.poste_id) : null
                    const bg = poste ? `${poste.color}15` : 'var(--accent-light)'
                    const borderColor = poste?.color ?? 'var(--accent)'
                    const textColor = poste?.color ?? 'var(--accent)'
                    const hours = calcHours(shift.start_time, shift.end_time, shift.break_minutes)
                    return (
                      <button
                        key={shift.id}
                        onClick={() => setModalState({ type: 'view', shift, employee, date, readOnly: weekLocked })}
                        style={{
                          backgroundColor: bg,
                          borderLeft: `3px solid ${borderColor}`,
                          borderRadius: '8px',
                          padding: '8px 12px',
                          border: 'none',
                          borderLeftWidth: '3px',
                          borderLeftStyle: 'solid',
                          borderLeftColor: borderColor,
                          display: 'flex', flexDirection: 'column', gap: '2px',
                          cursor: 'pointer', textAlign: 'left', minWidth: '120px',
                        }}
                        className="hover:brightness-[0.96] transition-all"
                      >
                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                          {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '6px' }}>{formatHours(hours)}</span>
                        </p>
                        <p style={{ fontSize: '12px', color: textColor, lineHeight: 1 }}>{shift.position ?? poste?.name ?? '—'}</p>
                      </button>
                    )
                  })}

                  {isRest && (
                    <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Repos</span>
                  )}
                </div>

                {/* Total + Add */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {totalHours > 0 && (
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '36px', textAlign: 'right' }}>
                      {formatHours(totalHours)}
                    </span>
                  )}
                  {!weekLocked && (
                    <button
                      onClick={() => setModalState({ type: 'create', employee, date })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '12px', padding: '5px 10px', borderRadius: '6px',
                        border: '0.5px solid var(--border)', backgroundColor: 'transparent',
                        color: 'var(--text-tertiary)', cursor: 'pointer',
                      }}
                      className="hover:text-[var(--accent)] hover:bg-[var(--accent-light)] hover:border-[var(--accent)] transition-all"
                    >
                      <Plus size={12} />
                      Ajouter
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ShiftModal
        modalState={modalState}
        onClose={() => setModalState({ type: 'closed' })}
        postes={postes}
        employees={employees}
        weekDates={[date]}
        shifts={shifts}
      />
    </div>
  )
}
