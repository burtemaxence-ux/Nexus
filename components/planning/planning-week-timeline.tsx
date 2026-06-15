'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Copy, Lock, Unlock, X,
  Mail, Share2, Check, AlertTriangle, Filter,
  Calendar, ChevronDown, SlidersHorizontal,
  Users, UserCheck, Clock, CopyPlus, Printer, Sparkles, Euro,
} from 'lucide-react'
import { type Profile, type Shift, type Poste, type LeaveRequest } from '@/types'
import { SosReplacementModal } from '@/components/planning/sos-replacement-modal'
import { getWeekLabel, toISODate, addDays } from '@/lib/utils/dates'
import { calcHours, formatHours, formatTime, isToday, getInitials } from '@/lib/planning-utils'
import { ShiftModal, type ModalState } from '@/components/planning/shift-modal'
import dynamic from 'next/dynamic'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { ContextMenu, type CtxMenu } from './shift-card'
import { GridCell } from './grid-cell'
import { MetricCard, DonutChart, AlertRow, ActivityRow } from './planning-metrics'
import { MobileManagerPlanning } from './mobile-planning'
import { AiQuotaBadge } from '@/components/ui/ai-quota-badge'

const AiPlanModal = dynamic(
  () => import('@/components/planning/ai-plan-modal').then(m => ({ default: m.AiPlanModal })),
  { ssr: false }
)

// ── Constants ──────────────────────────────────────────────────────────────────────────────
const TICK_HOURS = [0, 6, 12, 18, 24]

// ── Helpers ────────────────────────────────────────────────────────────────────────────────
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function formatEuros(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} €`
}

function shiftBarStyle(start: string, end: string): { left: string; width: string } {
  const startMin = timeToMinutes(start)
  let endMin = timeToMinutes(end)
  if (endMin <= startMin) endMin += 1440
  const left = (startMin / 1440) * 100
  const width = Math.max(((endMin - startMin) / 1440) * 100, 2.5)
  return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }
}

// ── Main component ───────────────────────────────────────────────────────────────────────────
export interface PlanningWeekTimelineProps {
  weekDates: Date[]
  employees: Profile[]
  shifts: Shift[]
  leaveRequests: LeaveRequest[]
  weekLocked: boolean
  weekPublished: boolean
  postes: Poste[]
  hourlyRateMap: Record<string, number>
}

export function PlanningWeekTimeline({
  weekDates, employees, shifts, leaveRequests, weekLocked, weekPublished, postes, hourlyRateMap,
}: PlanningWeekTimelineProps) {
  const router = useRouter()
  const mondayStr = toISODate(weekDates[0])
  const prevMonday = toISODate(addDays(weekDates[0], -7))
  const nextMonday = toISODate(addDays(weekDates[0], 7))
  const weekLabel = getWeekLabel(weekDates)
  const posteMap = useMemo(() => new Map<string, Poste>(postes.map(p => [p.id, p])), [postes])

  const [modal, setModal] = useState<ModalState>({ type: 'closed' })
  const [ctx, setCtx] = useState<CtxMenu | null>(null)
  const [sosState, setSosState] = useState<{ shift: Shift; employee: Profile } | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [copyLoading, setCopyLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [filterPoste, setFilterPoste] = useState('')
  const [showAiPlanModal, setShowAiPlanModal] = useState(false)
  const [aiQuotaKey, setAiQuotaKey] = useState(0)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // ── Data maps ──────────────────────────────────────────────────────────────────────────
  const shiftMap = useMemo(() => {
    const m = new Map<string, Shift[]>()
    for (const s of shifts) {
      const key = `${s.employee_id}__${s.date}`
      const arr = m.get(key) ?? []
      arr.push(s)
      m.set(key, arr)
    }
    return m
  }, [shifts])

  const absMap = useMemo(() => {
    const m = new Map<string, import('@/types').LeaveType>()
    for (const req of leaveRequests) {
      for (
        let d = new Date(req.start_date + 'T00:00:00');
        d <= new Date(req.end_date + 'T00:00:00');
        d.setDate(d.getDate() + 1)
      ) {
        m.set(`${req.employee_id}__${toISODate(d)}`, req.type)
      }
    }
    return m
  }, [leaveRequests])

  const positions = useMemo(
    () => Array.from(new Set(employees.map(e => e.position).filter(Boolean) as string[])).sort(),
    [employees]
  )
  const filteredEmps = useMemo(
    () => filterPoste ? employees.filter(e => e.position === filterPoste) : employees,
    [filterPoste, employees]
  )
  const activeDragShift = useMemo(
    () => activeDragId ? shifts.find(s => `shift-${s.id}` === activeDragId) : null,
    [activeDragId, shifts]
  )

  const dailyShiftCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of shifts) m.set(s.date, (m.get(s.date) ?? 0) + 1)
    return m
  }, [shifts])

  const dailyHourTotals = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of shifts) m.set(s.date, (m.get(s.date) ?? 0) + calcHours(s.start_time, s.end_time, s.break_minutes))
    return m
  }, [shifts])

  const { totalPlanned, coverage, overtime, totalCost } = useMemo(() => {
    const total = shifts.reduce((sum, s) => sum + calcHours(s.start_time, s.end_time, s.break_minutes), 0)
    const withShift = new Set(shifts.map(s => s.employee_id)).size
    const cov = employees.length > 0 ? Math.round((withShift / employees.length) * 100) : 0
    const hasHours = employees.some(e => e.weekly_hours != null)
    const ot = hasHours ? Math.max(0, total - employees.reduce((sum, e) => sum + (e.weekly_hours ?? 35), 0)) : null

    // Coût salarial brut estimé : heures × taux horaire (fallback : coût horaire du poste).
    let cost = 0
    let hasRate = false
    for (const s of shifts) {
      const rate = hourlyRateMap[s.employee_id] ?? posteMap.get(s.poste_id ?? '')?.hourly_cost ?? 0
      if (rate > 0) {
        hasRate = true
        cost += calcHours(s.start_time, s.end_time, s.break_minutes) * rate
      }
    }
    return { totalPlanned: total, coverage: cov, overtime: ot, totalCost: hasRate ? cost : null }
  }, [shifts, employees, hourlyRateMap, posteMap])

  // ── Handlers ─────────────────────────────────────────────────────────────────────────────
  const handleWeekStatus = useCallback(async (payload: { published?: boolean; locked?: boolean; acknowledge_violations?: boolean }) => {
    setStatusLoading(true)
    try {
      const res = await fetch('/api/week-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ week_monday: mondayStr, ...payload }) })

      // Blocage doux conformité : le serveur refuse la publication tant que les
      // infractions critiques ne sont pas explicitement assumées.
      if (res.status === 409) {
        const data = await res.json().catch(() => null) as { error?: string; violations?: { ruleName: string; legalRef: string; date: string; description: string }[] } | null
        if (data?.error === 'compliance_blocked') {
          const lines = (data.violations ?? []).slice(0, 8).map(v => `• ${v.ruleName} (${v.date}) — ${v.legalRef}`).join('\n')
          const ok = window.confirm(
            `⚠️ Ce planning contient ${data.violations?.length ?? 0} infraction(s) critique(s) au Code du Travail :\n\n${lines}\n\nEn publiant, vous assumez la responsabilité de ces écarts. Confirmer la publication ?`
          )
          if (ok) {
            await fetch('/api/week-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ week_monday: mondayStr, ...payload, acknowledge_violations: true }) })
          }
        }
      }
      router.refresh()
    } finally { setStatusLoading(false) }
  }, [mondayStr, router])

  const handleCopyWeek = useCallback(async () => {
    setCopyLoading(true)
    try {
      const res = await fetch('/api/shifts/copy-week', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_monday: mondayStr }) })
      if (!res.ok) throw new Error()
      router.push(`?week=${nextMonday}`)
    } finally { setCopyLoading(false) }
  }, [mondayStr, nextMonday, router])

  const handleResendEmails = useCallback(async () => {
    setEmailLoading(true)
    try {
      const res = await fetch('/api/shifts/send-planning-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ week_monday: mondayStr }) })
      const data = await res.json()
      setEmailFeedback(`✓ ${data.sent} email${data.sent !== 1 ? 's' : ''} envoyé${data.sent !== 1 ? 's' : ''}`)
      setTimeout(() => setEmailFeedback(null), 4000)
    } finally { setEmailLoading(false) }
  }, [mondayStr])

  const copyShift = useCallback(async (shift: Shift, targetEmployeeId: string, targetDate: string) => {
    await fetch('/api/shifts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: targetEmployeeId, date: targetDate, start_time: shift.start_time, end_time: shift.end_time, break_minutes: shift.break_minutes, position: shift.position, poste_id: shift.poste_id ?? null }),
    })
    router.refresh()
  }, [router])

  const deleteShift = useCallback(async (shiftId: string) => {
    await fetch(`/api/shifts/${shiftId}`, { method: 'DELETE' })
    router.refresh()
    setCtx(null)
  }, [router])

  const handleDragStart = useCallback((e: DragStartEvent) => { setActiveDragId(String(e.active.id)); setCtx(null) }, [])

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = e
    if (!over) return
    const shiftId = String(active.id).replace('shift-', '')
    const [targetEmpId, targetDate] = String(over.id).split('__')
    const shift = shifts.find(s => s.id === shiftId)
    if (!shift || (shift.employee_id === targetEmpId && shift.date === targetDate)) return
    await copyShift(shift, targetEmpId, targetDate)
  }, [shifts, copyShift])

  // ── Render ────────────────────────────────────────────────────────────────────────────────
  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

      {/* ── Mobile view ─────────────────────────────────────────────────────────────────── */}
      <div className="block md:hidden">
        <MobileManagerPlanning
          weekDates={weekDates} employees={employees} shiftMap={shiftMap} absMap={absMap}
          posteMap={posteMap} weekLocked={weekLocked} weekPublished={weekPublished}
          statusLoading={statusLoading} prevMonday={prevMonday} nextMonday={nextMonday}
          weekLabel={weekLabel} onWeekStatus={handleWeekStatus} onOpenModal={setModal}
          onSos={(shift, employee) => setSosState({ shift, employee })}
        />
      </div>

      {/* ── Desktop view ─────────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block">
      <div className="space-y-4" onClick={() => setCtx(null)}>

        {/* ── Toolbar ─────────────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Link href={`?week=${prevMonday}`}>
              <button className="btn-secondary" style={{ padding: '7px 9px' }} aria-label="Semaine précédente"><ChevronLeft size={14} /></button>
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

          <div style={{ display: 'flex', border: '0.5px solid var(--border)', borderRadius: '8px', overflow: 'hidden', fontSize: '13px' }}>
            <Link href={`/manager/planning?view=day&date=${toISODate(new Date())}`}>
              <div style={{ padding: '6px 14px', color: 'var(--text-tertiary)', cursor: 'pointer', transition: 'color 150ms' }} className="hover:text-[var(--text-primary)]">Jour</div>
            </Link>
            <div style={{ padding: '6px 14px', backgroundColor: 'var(--accent)', color: '#FFFFFF', userSelect: 'none', borderLeft: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)' }}>Semaine</div>
            <Link href="/manager/planning?view=month">
              <div style={{ padding: '6px 14px', color: 'var(--text-tertiary)', cursor: 'pointer', transition: 'color 150ms' }} className="hover:text-[var(--text-primary)]">Mois</div>
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {positions.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={13} style={{ color: 'var(--text-secondary)' }} />
                <select value={filterPoste} onChange={e => setFilterPoste(e.target.value)} className="dp-input py-1 text-[12px]" style={{ width: 'auto' }}>
                  <option value="">Tous les postes</option>
                  {positions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            )}
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <SlidersHorizontal size={13} />Filtres
            </button>
            <button className="btn-secondary" style={{ padding: '7px 9px', ...(weekLocked ? { borderColor: 'var(--warning)', color: 'var(--warning)' } : {}) }}
              onClick={() => handleWeekStatus({ locked: !weekLocked })} disabled={statusLoading} title={weekLocked ? 'Déverrouiller' : 'Verrouiller'}>
              {weekLocked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
            <button className="btn-secondary" style={{ padding: '7px 9px' }} onClick={handleCopyWeek} disabled={copyLoading || employees.length === 0} title="Copier vers semaine suivante"><Copy size={13} /></button>
            <button className="btn-secondary" style={{ padding: '7px 9px' }} onClick={handleResendEmails} disabled={emailLoading || employees.length === 0} title="Envoyer par email"><Mail size={13} /></button>
            <button className="btn-secondary" style={{ padding: '7px 9px' }} onClick={() => { navigator.clipboard.writeText(window.location.href); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) }} title="Partager">
              {shareCopied ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Share2 size={13} />}
            </button>
            <Link href={`/manager/planning/print?week=${mondayStr}`} target="_blank">
              <button className="btn-secondary" style={{ padding: '7px 9px' }} title="Exporter PDF"><Printer size={13} /></button>
            </Link>
            <AiQuotaBadge refreshKey={aiQuotaKey} />
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', borderColor: 'var(--accent)', color: 'var(--accent)' }}
              onClick={() => setShowAiPlanModal(true)} title="Générer le planning automatiquement avec l'IA">
              <Sparkles size={13} />Générer
            </button>
            <button className="btn-primary" onClick={() => handleWeekStatus({ published: !weekPublished })} disabled={statusLoading || employees.length === 0}
              style={{ paddingLeft: '18px', paddingRight: '18px', gap: '6px', opacity: statusLoading ? 0.6 : 1 }}>
              {weekPublished ? <><Check size={13} />Publié</> : 'Publier'}
            </button>
            {emailFeedback && <span style={{ fontSize: '12px', color: emailFeedback.startsWith('✓') ? 'var(--success)' : 'var(--danger)' }}>{emailFeedback}</span>}
          </div>
        </div>

        {/* ── Metric cards ─────────────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <MetricCard icon={<Users size={18} />} iconBg="var(--accent-light)" iconColor="var(--accent)" value={totalPlanned > 0 ? formatHours(totalPlanned) : '0h'} label="Total planifiées" trend={totalPlanned > 0 ? 'up' : null} />
          <MetricCard icon={<UserCheck size={18} />} iconBg="#FFF7ED" iconColor="#EA580C" value="—" label="Total travaillées" trend={null} />
          <MetricCard icon={<Clock size={18} />} iconBg="#F5F5F5" iconColor="var(--text-secondary)" value={overtime != null ? formatHours(overtime) : '—'} label="Heures supp." trend={overtime != null && overtime > 0 ? 'up' : null} />
          <MetricCard icon={<Clock size={18} />} iconBg="#F5F3FF" iconColor="#7C3AED" value={employees.length > 0 ? `${coverage}%` : '—'} label="Couverture" trend={coverage >= 80 ? 'up' : coverage > 0 ? 'down' : null} />
          <MetricCard icon={<Euro size={18} />} iconBg="#ECFDF5" iconColor="#059669" value={totalCost != null ? formatEuros(totalCost) : '—'} label={totalCost != null ? 'Coût salarial (brut)' : 'Coût — ajoutez les taux horaires'} trend={null} />
        </div>

        {/* ── Empty state ─────────────────────────────────────────────────────────────────── */}
        {employees.length === 0 ? (
          <div className="rounded-xl p-12 text-center" style={{ border: '0.5px dashed var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <p className="text-[13px] mb-3" style={{ color: 'var(--text-secondary)' }}>Ajoutez des employés pour commencer à planifier</p>
            <Link href="/manager/employees"><button className="btn-secondary">Gérer les employés</button></Link>
          </div>
        ) : (
          /* ── Timeline grid ─────────────────────────────────────────────────────────────────── */
          <div style={{ borderRadius: '12px', border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)', overflow: 'hidden', opacity: weekLocked ? 0.72 : 1, filter: weekLocked ? 'saturate(0.45)' : 'none', transition: 'opacity 300ms, filter 300ms' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '200px' }} />
                  {weekDates.map(d => <col key={toISODate(d)} />)}
                  <col style={{ width: '64px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)', padding: '12px 16px', textAlign: 'left', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>Employés</span>
                        <SlidersHorizontal size={11} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} />
                      </div>
                    </th>
                    {weekDates.map(date => {
                      const today = isToday(date)
                      const dateStr = toISODate(date)
                      const count = dailyShiftCounts.get(dateStr) ?? 0
                      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')
                      const dayNum = date.getDate()
                      return (
                        <th key={dateStr} style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)', padding: '12px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'capitalize', fontWeight: 400 }}>{dayName}.</span>
                            {today ? (
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--accent)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600 }}>{dayNum}</div>
                            ) : (
                              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', width: '28px', textAlign: 'center', lineHeight: '28px' }}>{dayNum}</span>
                            )}
                            {count > 0 && <span style={{ fontSize: '10px', color: today ? 'var(--accent)' : 'var(--text-tertiary)' }}>{count} shift{count > 1 ? 's' : ''}</span>}
                          </div>
                        </th>
                      )
                    })}
                    <th style={{ borderBottom: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)', padding: '12px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>H/sem</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmps.map(emp => {
                    const weekTotal = weekDates.reduce((sum, date) => {
                      const ds = shiftMap.get(`${emp.id}__${toISODate(date)}`) ?? []
                      return sum + ds.reduce((s, sh) => s + calcHours(sh.start_time, sh.end_time, sh.break_minutes), 0)
                    }, 0)
                    return (
                      <tr key={emp.id}>
                        <td style={{ borderBottom: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>{getInitials(emp.full_name)}</span>
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{emp.full_name ?? emp.email}</p>
                              {emp.position && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px', lineHeight: 1 }}>{emp.position}</p>}
                            </div>
                            {weekTotal > 0 && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0, whiteSpace: 'nowrap' }}>{formatHours(weekTotal)} / sem.</span>}
                          </div>
                        </td>
                        {weekDates.map(date => {
                          const dateStr = toISODate(date)
                          const did = `${emp.id}__${dateStr}`
                          const dayShifts = shiftMap.get(did) ?? []
                          const leaveType = absMap.get(did)
                          const todayCol = isToday(date)
                          return (
                            <GridCell
                              key={dateStr} droppableId={did} shifts={dayShifts} leaveType={leaveType}
                              postes={posteMap} weekLocked={weekLocked} isToday={todayCol}
                              onAdd={() => !weekLocked && setModal({ type: 'create', employee: emp, date })}
                              onClickShift={s => setModal({ type: 'view', shift: s, employee: emp, date, readOnly: weekLocked })}
                              onContextMenu={(e, s) => setCtx({ x: e.clientX, y: e.clientY, shift: s, employee: emp, date })}
                              onSos={s => setSosState({ shift: s, employee: emp })}
                            />
                          )
                        })}
                        <td style={{ borderBottom: '0.5px solid var(--border)', padding: '12px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                          {weekTotal > 0
                            ? <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{formatHours(weekTotal)}</span>
                            : <span style={{ fontSize: '14px', color: 'var(--border)', fontWeight: 300 }}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ borderTop: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)', padding: '10px 16px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>Total / jour</span>
                    </td>
                    {weekDates.map(date => {
                      const dateStr = toISODate(date)
                      const total = dailyHourTotals.get(dateStr) ?? 0
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

        {/* ── Bottom section ─────────────────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '8px' }}>
          <div className="dp-card">
            <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '16px' }}>Aperçu par service</h3>
            {postes.length === 0 || shifts.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0' }}>Aucun shift planifié</p>
            ) : (
              <DonutChart shifts={shifts} postes={postes} />
            )}
          </div>

          <div className="dp-card">
            <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '16px' }}>Alertes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {coverage < 80 && employees.length > 0 && (
                <AlertRow iconBg="#FEF3C7" iconColor="var(--warning)" icon={<Clock size={14} />}
                  title="Couverture insuffisante" desc={`Seulement ${coverage}% des employés ont un shift cette semaine`}
                  badge={{ label: `${100 - coverage}% manquants`, color: 'var(--warning)', bg: '#FEF3C7' }} />
              )}
              {overtime != null && overtime > 2 && (
                <AlertRow iconBg="#FEE2E2" iconColor="var(--danger)" icon={<Clock size={14} />}
                  title="Heures supplémentaires" desc={`${formatHours(overtime)} d'heures au-dessus du contractuel cette semaine`}
                  badge={{ label: `+${formatHours(overtime)}`, color: 'var(--danger)', bg: '#FEE2E2' }} />
              )}
              {coverage >= 80 && (overtime == null || overtime <= 2) && (
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0' }}>Aucune alerte active</p>
              )}
            </div>
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '0.5px solid var(--border)' }}>
              <a href="/manager/planning" style={{ fontSize: '13px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                Voir toutes les alertes <ChevronRight size={13} />
              </a>
            </div>
          </div>

          <div className="dp-card">
            <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '16px' }}>Activité récente</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {weekPublished && <ActivityRow iconBg="var(--accent-light)" iconColor="var(--accent)" icon={<Check size={14} />} desc="Semaine publiée" sub={weekLabel} />}
              {weekPublished === false && shifts.length > 0 && (
                <ActivityRow iconBg="#FEF3C7" iconColor="var(--warning)" icon={<AlertTriangle size={14} />}
                  desc="Planning non publié" sub={`${shifts.length} shift${shifts.length > 1 ? 's' : ''} en attente`} />
              )}
              {shifts.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0' }}>Aucune activité récente</p>}
            </div>
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '0.5px solid var(--border)' }}>
              <a href="/manager/planning" style={{ fontSize: '13px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                {"Voir toute l'activité"} <ChevronRight size={13} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Context menu ─────────────────────────────────────────────────────────────────── */}
      {ctx && (
        <ContextMenu
          menu={ctx} weekDates={weekDates}
          onEdit={() => { setModal({ type: 'view', shift: ctx.shift, employee: ctx.employee, date: ctx.date, readOnly: false }); setCtx(null) }}
          onDelete={() => deleteShift(ctx.shift.id)}
          onCopyTo={date => { copyShift(ctx.shift, ctx.shift.employee_id, toISODate(date)); setCtx(null) }}
          onClose={() => setCtx(null)}
        />
      )}
      </div>

      {/* ── Modaux ──────────────────────────────────────────────────────────────────────────────── */}
      <ShiftModal modalState={modal} onClose={() => setModal({ type: 'closed' })} postes={postes} employees={employees} weekDates={weekDates} shifts={shifts} />

      {sosState && (
        <SosReplacementModal shift={sosState.shift} employee={sosState.employee}
          poste={sosState.shift.poste_id ? posteMap.get(sosState.shift.poste_id) : null}
          onClose={() => setSosState(null)} />
      )}

      {showAiPlanModal && (
        <AiPlanModal weekMonday={mondayStr} weekLabel={weekLabel} employees={employees} postes={postes}
          onSuccess={() => { router.refresh(); setAiQuotaKey(k => k + 1) }}
          onClose={() => setShowAiPlanModal(false)} />
      )}

      <DragOverlay>
        {activeDragShift ? (
          <div style={{ height: '28px', borderRadius: '6px', padding: '0 10px', border: '0.5px solid var(--accent)', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, cursor: 'grabbing', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
            <CopyPlus size={12} />
            {formatTime(activeDragShift.start_time)}–{formatTime(activeDragShift.end_time)}
            <span style={{ fontSize: '10px', opacity: 0.6 }}>copier</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
