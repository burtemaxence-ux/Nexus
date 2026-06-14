'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Sparkles, Send } from 'lucide-react'
import shiftsData from '@/data/shifts.json'
import employees from '@/data/employees.json'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function getWeekDates(offset = 0): Date[] {
  const now = new Date()
  const dow = now.getDay() === 0 ? 7 : now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - dow + 1 + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function isToday(d: Date) {
  const t = new Date()
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
}

function demoAction() {
  toast.info('🎭 Mode démo — cette action n\'est pas disponible')
}

export default function ManagerPlanningPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekDates = getWeekDates(weekOffset)

  const weekLabel = (() => {
    const start = weekDates[0]
    const end = weekDates[6]
    return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
  })()

  const totalHours = shiftsData.reduce((acc, s) => {
    const [sh, sm] = s.start.split(':').map(Number)
    const [eh, em] = s.end.split(':').map(Number)
    return acc + (eh * 60 + em - sh * 60 - sm) / 60
  }, 0)

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <h1 className="text-[18px] font-semibold tracking-tight flex-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
            Planning
          </h1>
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
            <button onClick={() => demoAction()} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--accent-light)] transition-colors">
              <ChevronLeft className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
            <span className="text-[13px] px-3" style={{ color: 'var(--text-primary)' }}>{weekLabel}</span>
            <button onClick={() => demoAction()} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--accent-light)] transition-colors">
              <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={demoAction}
              title="Fonctionnalité démo"
              className="btn-secondary flex items-center gap-1.5 cursor-not-allowed opacity-70"
            >
              <Sparkles className="h-3.5 w-3.5" /> Générer avec l&apos;IA
            </button>
            <button
              onClick={demoAction}
              title="Fonctionnalité démo"
              className="btn-primary flex items-center gap-1.5 cursor-not-allowed opacity-70"
            >
              <Send className="h-3.5 w-3.5" /> Publier
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-4 mb-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          <span>{employees.length} employés</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span>{shiftsData.length} shifts</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span>{Math.round(totalHours)}h planifiées</span>
        </div>

        {/* Grid */}
        <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          {/* Day headers */}
          <div className="grid" style={{ gridTemplateColumns: '160px repeat(7, 1fr)' }}>
            <div className="px-3 py-2.5 border-r" style={{ borderColor: 'var(--border)', borderWidth: '0.5px' }} />
            {weekDates.map((d, i) => (
              <div
                key={i}
                className="px-2 py-2.5 text-center border-r last:border-r-0"
                style={{ borderColor: 'var(--border)', borderWidth: '0.5px', backgroundColor: isToday(d) ? 'rgba(108,99,255,0.08)' : undefined }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: isToday(d) ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                  {DAYS[i]}
                </p>
                <p className="text-[12px] font-medium mt-0.5" style={{ color: isToday(d) ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {formatDate(d)}
                </p>
              </div>
            ))}
          </div>

          {/* Employee rows */}
          {employees.map((emp, ei) => {
            const empShifts = shiftsData.filter(s => s.employee_id === emp.id)
            return (
              <div
                key={emp.id}
                className="grid border-t"
                style={{ gridTemplateColumns: '160px repeat(7, 1fr)', borderColor: 'var(--border)', borderWidth: '0.5px' }}
              >
                {/* Employee name */}
                <div className="flex items-center gap-2 px-3 py-2 border-r" style={{ borderColor: 'var(--border)', borderWidth: '0.5px' }}>
                  <div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
                    <span className="text-[9px] font-semibold" style={{ color: 'var(--accent)' }}>{emp.initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{emp.name}</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>{emp.role}</p>
                  </div>
                </div>

                {/* Day cells */}
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  const shift = empShifts.find(s => s.day === dayIdx)
                  return (
                    <div
                      key={dayIdx}
                      className="p-1.5 border-r last:border-r-0 min-h-[56px] flex items-center"
                      style={{
                        borderColor: 'var(--border)', borderWidth: '0.5px',
                        backgroundColor: isToday(weekDates[dayIdx]) ? 'rgba(108,99,255,0.04)' : undefined,
                      }}
                    >
                      {shift && (
                        <button
                          onClick={demoAction}
                          title="Fonctionnalité démo"
                          className="w-full rounded-md px-1.5 py-1 text-left cursor-not-allowed"
                          style={{
                            backgroundColor: `${shift.color}20`,
                            border: `1px solid ${shift.color}40`,
                          }}
                        >
                          <p className="text-[10px] font-semibold truncate" style={{ color: shift.color }}>{shift.start}–{shift.end}</p>
                          <p className="text-[9px] truncate" style={{ color: shift.color, opacity: 0.7 }}>{shift.label}</p>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
