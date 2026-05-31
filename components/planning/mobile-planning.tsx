'use client'

import { useState, useRef, memo } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Check, Plus, X, Zap } from 'lucide-react'
import type { Profile, Shift, Poste, LeaveType } from '@/types'
import type { ModalState } from '@/components/planning/shift-modal'
import { calcHours, formatHours, formatTime, isToday, getInitials, LEAVE_STYLES } from '@/lib/planning-utils'
import { toISODate } from '@/lib/utils/dates'

export interface MobileManagerPlanningProps {
  weekDates: Date[]
  employees: Profile[]
  shiftMap: Map<string, Shift[]>
  absMap: Map<string, LeaveType>
  posteMap: Map<string, Poste>
  weekLocked: boolean
  weekPublished: boolean
  statusLoading: boolean
  prevMonday: string
  nextMonday: string
  weekLabel: string
  onWeekStatus: (payload: { published?: boolean; locked?: boolean }) => void
  onOpenModal: (state: ModalState) => void
  onSos: (shift: Shift, employee: Profile) => void
}

export const MobileManagerPlanning = memo(function MobileManagerPlanning({
  weekDates, employees, shiftMap, absMap, posteMap,
  weekLocked, weekPublished, statusLoading,
  prevMonday, nextMonday, weekLabel,
  onWeekStatus, onOpenModal, onSos,
}: MobileManagerPlanningProps) {
  const todayIndex = weekDates.findIndex(d => isToday(d))
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex >= 0 ? todayIndex : 0)
  const [showEmpPicker, setShowEmpPicker] = useState(false)
  const [longPressMenu, setLongPressMenu] = useState<{ shift: Shift; employee: Profile } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedDate = weekDates[selectedDayIndex]
  const selectedDateStr = toISODate(selectedDate)

  const dayShiftCount = employees.reduce(
    (sum, emp) => sum + (shiftMap.get(`${emp.id}__${selectedDateStr}`)?.length ?? 0),
    0
  )

  const selectedDayLabel = selectedDate.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="space-y-3 relative">

      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Link
          href={`?week=${prevMonday}`}
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="text-[13px] font-medium flex-1 text-center" style={{ color: 'var(--text-primary)' }}>{weekLabel}</span>
        <Link
          href={`?week=${nextMonday}`}
          className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* View toggle + Publish button */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg overflow-hidden flex-1" style={{ border: '0.5px solid var(--border)', fontSize: '12px' }}>
          <Link href={`/manager/planning?view=day&date=${selectedDateStr}`} className="flex-1 text-center py-1.5" style={{ color: 'var(--text-tertiary)' }}>Jour</Link>
          <div className="flex-1 text-center py-1.5" style={{ background: 'var(--accent)', color: '#fff', borderLeft: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)' }}>Semaine</div>
          <Link href="/manager/planning?view=month" className="flex-1 text-center py-1.5" style={{ color: 'var(--text-tertiary)' }}>Mois</Link>
        </div>
        <button
          onClick={() => onWeekStatus({ published: !weekPublished })}
          disabled={statusLoading || employees.length === 0}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-medium flex-shrink-0"
          style={{
            background: weekPublished ? 'var(--accent-light)' : 'var(--accent)',
            color: weekPublished ? 'var(--accent)' : '#fff',
            border: weekPublished ? '0.5px solid var(--accent)' : 'none',
            opacity: statusLoading ? 0.6 : 1,
          }}
        >
          {weekPublished ? <><Check className="h-3 w-3" />Publié</> : 'Publier'}
        </button>
      </div>

      {/* Day carousel */}
      <div className="grid grid-cols-7 gap-1">
        {weekDates.map((date, i) => {
          const dateStr = toISODate(date)
          const today = isToday(date)
          const selected = i === selectedDayIndex
          const count = employees.reduce((sum, emp) => sum + (shiftMap.get(`${emp.id}__${dateStr}`)?.length ?? 0), 0)
          const wd = date.toLocaleDateString('fr-FR', { weekday: 'narrow' }).toUpperCase()
          const dayNum = date.getDate()
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDayIndex(i)}
              className="flex flex-col items-center py-2.5 px-0.5 rounded-xl transition-all duration-150 gap-0.5"
              style={{
                background: selected ? 'var(--accent)' : today ? 'var(--accent-light)' : 'var(--bg-card)',
                border: selected ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
              }}
            >
              <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: selected ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)' }}>{wd}</span>
              <span className="text-[16px] font-bold leading-none" style={{ color: selected ? '#fff' : today ? 'var(--accent)' : 'var(--text-primary)' }}>{dayNum}</span>
              {count > 0 && <span className="text-[8px] font-medium" style={{ color: selected ? 'rgba(255,255,255,0.6)' : 'var(--text-tertiary)' }}>{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Employee list for selected day */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <h3 className="text-[13px] font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{selectedDayLabel}</h3>
          <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{dayShiftCount} shift{dayShiftCount !== 1 ? 's' : ''}</span>
        </div>

        {employees.length === 0 ? (
          <div className="py-10 text-center px-4">
            <p className="text-[13px] mb-1" style={{ color: 'var(--text-secondary)' }}>Aucun employé</p>
            <Link href="/manager/employees" className="text-[13px]" style={{ color: 'var(--accent)' }}>Ajouter un employé</Link>
          </div>
        ) : (
          <div>
            {employees.map((emp, idx) => {
              const did = `${emp.id}__${selectedDateStr}`
              const dayShifts = shiftMap.get(did) ?? []
              const absence = absMap.get(did)
              const isLast = idx === employees.length - 1
              return (
                <div key={emp.id} className="px-4 py-3" style={{ borderBottom: isLast ? 'none' : '0.5px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-light)' }}>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--accent)' }}>{getInitials(emp.full_name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{emp.full_name ?? emp.email}</p>
                      {emp.position && <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{emp.position}</p>}
                    </div>
                    {!weekLocked && (
                      <button
                        onClick={() => onOpenModal({ type: 'create', employee: emp, date: selectedDate })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="mt-2 ml-11 space-y-1.5">
                    {absence && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
                        style={{ background: LEAVE_STYLES[absence].bg, color: LEAVE_STYLES[absence].color }}>
                        {LEAVE_STYLES[absence].label}
                      </div>
                    )}
                    {dayShifts.length === 0 && !absence && (
                      <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Repos</p>
                    )}
                    {dayShifts.map(shift => {
                      const poste = shift.poste_id ? posteMap.get(shift.poste_id) : null
                      const borderColor = poste?.color ?? 'var(--accent)'
                      const textColor = poste?.color ?? 'var(--accent)'
                      const bgColor = poste ? `${poste.color}15` : 'var(--accent-light)'
                      const hours = calcHours(shift.start_time, shift.end_time, shift.break_minutes)
                      return (
                        <button
                          key={shift.id}
                          onClick={() => onOpenModal({ type: 'view', shift, employee: emp, date: selectedDate, readOnly: weekLocked })}
                          onTouchStart={() => { longPressTimer.current = setTimeout(() => setLongPressMenu({ shift, employee: emp }), 500) }}
                          onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }}
                          onTouchMove={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }}
                          className="w-full text-left rounded-lg px-3 py-2"
                          style={{ background: bgColor, border: `0.5px solid ${borderColor}` }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-semibold" style={{ color: textColor }}>{formatTime(shift.start_time)} – {formatTime(shift.end_time)}</span>
                            <span className="text-[11px]" style={{ color: textColor, opacity: 0.7 }}>{formatHours(hours)}</span>
                          </div>
                          {shift.position && <p className="text-[11px] mt-0.5" style={{ color: textColor, opacity: 0.8 }}>{shift.position}</p>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB + */}
      {!weekLocked && employees.length > 0 && (
        <button
          onClick={() => setShowEmpPicker(true)}
          className="fixed right-4 z-20 w-12 h-12 rounded-full flex items-center justify-center shadow-lg md:hidden"
          style={{ background: 'var(--accent)', color: '#fff', bottom: 'calc(60px + env(safe-area-inset-bottom, 0px) + 16px)' }}
        >
          <Plus className="h-5 w-5" />
        </button>
      )}

      {/* Employee picker bottom sheet */}
      {showEmpPicker && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowEmpPicker(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))' }}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} /></div>
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Ajouter un shift — choisir un employé</span>
              <button onClick={() => setShowEmpPicker(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-tertiary)' }}><X className="h-4 w-4" /></button>
            </div>
            <div className="px-3 pb-2 max-h-[50vh] overflow-y-auto">
              {employees.map(emp => (
                <button key={emp.id}
                  onClick={() => { setShowEmpPicker(false); onOpenModal({ type: 'create', employee: emp, date: selectedDate }) }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors"
                  style={{ color: 'var(--text-primary)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-light)' }}>
                    <span className="text-[10px] font-bold" style={{ color: 'var(--accent)' }}>{getInitials(emp.full_name)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate">{emp.full_name ?? emp.email}</p>
                    {emp.position && <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{emp.position}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Long press context menu — bottom sheet */}
      {longPressMenu && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setLongPressMenu(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))' }}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} /></div>
            <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{formatTime(longPressMenu.shift.start_time)} – {formatTime(longPressMenu.shift.end_time)}</p>
              <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{longPressMenu.employee.full_name ?? longPressMenu.employee.email}</p>
            </div>
            <div className="px-3 py-2">
              <button
                onClick={() => { const { shift, employee } = longPressMenu; setLongPressMenu(null); onSos(shift, employee) }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left"
                style={{ background: '#FEF3C7', border: '0.5px solid #F59E0B' }}
              >
                <Zap size={18} style={{ color: '#D97706', flexShrink: 0 }} />
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: '#92400E' }}>Absence imprévue</p>
                  <p className="text-[12px]" style={{ color: '#B45309' }}>Rechercher un remplaçant</p>
                </div>
              </button>
              <button
                onClick={() => { const { shift, employee } = longPressMenu; setLongPressMenu(null); onOpenModal({ type: 'view', shift, employee, date: selectedDate, readOnly: weekLocked }) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left mt-1"
                style={{ color: 'var(--text-primary)' }}
              >
                <span className="text-[14px]">Modifier le shift</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
})
