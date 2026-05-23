'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus, Lock, Unlock, Share2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

const LEAVE_LABELS: Record<LeaveType, { label: string; className: string; icon: string }> = {
  CP:         { label: 'Congé payé',  className: 'bg-blue-100 text-blue-700 border-blue-200',   icon: '🏖️' },
  RTT:        { label: 'RTT',         className: 'bg-violet-100 text-violet-700 border-violet-200', icon: '🗓️' },
  maladie:    { label: 'Maladie',     className: 'bg-red-100 text-red-700 border-red-200',       icon: '🤒' },
  sans_solde: { label: 'Sans solde',  className: 'bg-slate-100 text-slate-600 border-slate-300', icon: '📋' },
  autre:      { label: 'Absence',     className: 'bg-amber-100 text-amber-700 border-amber-200', icon: '📌' },
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
  const [modalState, setModalState] = useState<ModalState>({ type: 'closed' })
  const [statusLoading, setStatusLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  const dateStr = toISODate(date)
  const prevDate = addDays(date, -1)
  const nextDate = addDays(date, 1)

  const dayLabel = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const isTodayDate = toISODate(new Date()) === dateStr

  // Build lookups
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
      if (toISODate(d) === dateStr) {
        absenceMap.set(req.employee_id, req.type)
      }
    }
  }

  // Sort: employees with shifts first (by start time), then absences, then rest
  const sorted = [...employees].sort((a, b) => {
    const aShifts = dayShiftMap.get(a.id) ?? []
    const bShifts = dayShiftMap.get(b.id) ?? []
    const aAbs = absenceMap.has(a.id)
    const bAbs = absenceMap.has(b.id)
    if (aShifts.length > 0 && bShifts.length === 0) return -1
    if (bShifts.length > 0 && aShifts.length === 0) return 1
    if (aShifts.length > 0 && bShifts.length > 0) {
      return aShifts[0].start_time.localeCompare(bShifts[0].start_time)
    }
    if (aAbs && !bAbs) return -1
    if (bAbs && !aAbs) return 1
    return (a.full_name ?? '').localeCompare(b.full_name ?? '')
  })

  const totalDayHours = shifts.reduce((s, sh) => s + calcHours(sh.start_time, sh.end_time, sh.break_minutes), 0)

  async function handleWeekStatus(payload: { published?: boolean; locked?: boolean }) {
    setStatusLoading(true)
    try {
      // Get the monday of this week
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
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
            <div className="px-4 py-2 bg-gray-900 text-white select-none">Jour</div>
            <Link href={`/manager/planning?week=${dateStr}`} className="px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors">Semaine</Link>
            <Link href={`/manager/planning?view=month`} className="px-4 py-2 text-gray-600 hover:bg-gray-50 transition-colors">Mois</Link>
          </div>
          <Link href={`/manager/planning?view=day&date=${toISODate(prevDate)}`}>
            <Button variant="outline" size="sm" className="gap-1"><ChevronLeft className="h-4 w-4" />Préc.</Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <h2 className={`text-base font-semibold ${isTodayDate ? 'text-blue-700' : 'text-gray-900'}`}>
            {dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}
            {isTodayDate && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">Aujourd&apos;hui</span>}
          </h2>
          {totalDayHours > 0 && (
            <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
              {formatHours(totalDayHours)} planifiées
            </span>
          )}

          {/* Publish toggle */}
          <button
            role="switch"
            aria-checked={weekPublished}
            onClick={() => handleWeekStatus({ published: !weekPublished })}
            disabled={statusLoading}
            className={`relative inline-flex h-7 w-[120px] cursor-pointer items-center rounded-full border transition-colors duration-300 focus:outline-none disabled:opacity-50 ${weekPublished ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}
          >
            <span className={`absolute h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-300 ${weekPublished ? 'translate-x-[92px]' : 'translate-x-1'}`} />
            <span className={`absolute inset-0 flex items-center transition-opacity ${weekPublished ? 'opacity-100' : 'opacity-0'}`}>
              <span className="pl-3 text-xs font-semibold text-white">Publié</span>
            </span>
            <span className={`absolute inset-0 flex items-center justify-end transition-opacity ${weekPublished ? 'opacity-0' : 'opacity-100'}`}>
              <span className="pr-3 text-xs font-semibold text-gray-500">Non-publié</span>
            </span>
          </button>

          <Button
            variant="outline" size="sm"
            className={`gap-1.5 ${weekLocked ? 'border-orange-300 text-orange-700' : ''}`}
            onClick={() => handleWeekStatus({ locked: !weekLocked })}
            disabled={statusLoading}
          >
            {weekLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            {weekLocked ? 'Verrouillé' : 'Verrouiller'}
          </Button>

          <Button
            variant="outline" size="sm" className="gap-1.5"
            onClick={() => { navigator.clipboard.writeText(window.location.href); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) }}
          >
            {shareCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Share2 className="h-3.5 w-3.5" />}
            {shareCopied ? 'Copié !' : 'Partager'}
          </Button>
        </div>

        <Link href={`/manager/planning?view=day&date=${toISODate(nextDate)}`}>
          <Button variant="outline" size="sm" className="gap-1">Suiv.<ChevronRight className="h-4 w-4" /></Button>
        </Link>
      </div>

      {/* Employee cards */}
      {employees.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500 mb-3">Ajoutez des employés pour commencer à planifier</p>
          <Link href="/manager/employees"><Button variant="outline" size="sm">Gérer les employés</Button></Link>
        </div>
      ) : (
        <div className={`space-y-2 transition-all ${weekLocked ? 'opacity-60 saturate-50' : ''}`}>
          {sorted.map(employee => {
            const empShifts = dayShiftMap.get(employee.id) ?? []
            const absenceType = absenceMap.get(employee.id)
            const hasShifts = empShifts.length > 0
            const isRest = !hasShifts && !absenceType
            const totalHours = empShifts.reduce((s, sh) => s + calcHours(sh.start_time, sh.end_time, sh.break_minutes), 0)

            return (
              <div
                key={employee.id}
                className={`rounded-xl border bg-white transition-all ${isRest ? 'border-gray-100' : 'border-gray-200 shadow-sm'}`}
              >
                <div className="flex items-center gap-4 px-4 py-3">
                  {/* Avatar */}
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${hasShifts ? 'bg-primary/10 text-primary' : isRest ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-700'}`}>
                    {getInitials(employee.full_name)}
                  </div>

                  {/* Name */}
                  <div className="w-44 min-w-[176px]">
                    <p className={`text-sm font-medium ${isRest ? 'text-gray-400' : 'text-gray-900'}`}>
                      {employee.full_name ?? employee.email}
                    </p>
                    {employee.position && (
                      <p className="text-xs text-gray-400">{employee.position}</p>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex items-center gap-3 flex-wrap">
                    {absenceType && (
                      <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium border ${LEAVE_LABELS[absenceType].className}`}>
                        <span>{LEAVE_LABELS[absenceType].icon}</span>
                        <span>{LEAVE_LABELS[absenceType].label}</span>
                      </div>
                    )}

                    {empShifts.map(shift => {
                      const poste = shift.poste_id ? posteMap.get(shift.poste_id) : null
                      const bgColor = poste ? `${poste.color}18` : '#EFF6FF'
                      const borderColor = poste ? `${poste.color}60` : '#BFDBFE'
                      const textColor = poste?.color ?? '#1D4ED8'
                      const hours = calcHours(shift.start_time, shift.end_time, shift.break_minutes)
                      return (
                        <button
                          key={shift.id}
                          onClick={() => setModalState({ type: 'view', shift, employee, date, readOnly: weekLocked })}
                          style={{ backgroundColor: bgColor, borderColor, color: textColor }}
                          className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:opacity-80 transition-opacity text-left"
                        >
                          <div>
                            <p className="font-semibold">{formatTime(shift.start_time)} &ndash; {formatTime(shift.end_time)}</p>
                            <p className="text-xs opacity-75">{shift.position ?? poste?.name ?? '—'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatHours(hours)}</p>
                            {shift.break_minutes > 0 && <p className="text-xs opacity-60">pause {shift.break_minutes}min</p>}
                          </div>
                        </button>
                      )
                    })}

                    {isRest && (
                      <span className="text-xs text-gray-300 font-medium tracking-wide">Repos</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {totalHours > 0 && (
                      <span className="text-sm font-bold text-gray-700 w-12 text-right">{formatHours(totalHours)}</span>
                    )}
                    {!weekLocked && (
                      <button
                        onClick={() => setModalState({ type: 'create', employee, date })}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-primary/5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter
                      </button>
                    )}
                  </div>
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
      />
    </div>
  )
}
