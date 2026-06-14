'use client'

import { toast } from 'sonner'
import { Calendar } from 'lucide-react'
import shiftsData from '@/data/shifts.json'
import employees from '@/data/employees.json'

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MY_EMPLOYEE_ID = '2'

function getWeekDates(): Date[] {
  const now = new Date()
  const dow = now.getDay() === 0 ? 7 : now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - dow + 1)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function isToday(d: Date) {
  const t = new Date()
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear()
}

function demoAction() {
  toast.info('🎭 Mode démo — cette action n\'est pas disponible')
}

export default function EmployeePlanningPage() {
  const weekDates = getWeekDates()
  const myShifts = shiftsData.filter(s => s.employee_id === MY_EMPLOYEE_ID)

  const totalDays = myShifts.length
  const totalHours = myShifts.reduce((acc, s) => {
    const [sh, sm] = s.start.split(':').map(Number)
    const [eh, em] = s.end.split(':').map(Number)
    return acc + (eh * 60 + em - sh * 60 - sm) / 60
  }, 0)

  const weekLabel = (() => {
    const start = weekDates[0]
    const end = weekDates[6]
    return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
  })()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Calendar className="h-5 w-5" style={{ color: 'var(--accent)' }} />
          <div>
            <h1 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
              Mon planning
            </h1>
            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{weekLabel}</p>
          </div>
        </div>

        {/* Récap */}
        <div className="flex items-center gap-4 mb-5 px-4 py-3 rounded-xl text-[13px]"
          style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{totalDays} jours travaillés</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span style={{ color: 'var(--text-secondary)' }}>{totalHours}h planifiées</span>
        </div>

        {/* Day-by-day */}
        <div className="space-y-2">
          {weekDates.map((d, dayIdx) => {
            const myShift = myShifts.find(s => s.day === dayIdx)
            const otherShifts = shiftsData.filter(s => s.employee_id !== MY_EMPLOYEE_ID && s.day === dayIdx)

            return (
              <div
                key={dayIdx}
                className="rounded-xl overflow-hidden"
                style={{
                  border: `0.5px solid ${isToday(d) ? 'rgba(108,99,255,0.4)' : 'var(--border)'}`,
                  backgroundColor: 'var(--bg-card)',
                }}
              >
                {/* Day header */}
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{
                    backgroundColor: isToday(d) ? 'rgba(108,99,255,0.08)' : 'var(--bg-page)',
                    borderBottom: '0.5px solid var(--border)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: isToday(d) ? 'var(--accent)' : 'var(--text-secondary)' }}>
                      {DAYS[dayIdx]}
                    </span>
                    <span className="text-[12px]" style={{ color: isToday(d) ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                      {d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                    {isToday(d) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(108,99,255,0.15)', color: 'var(--accent)' }}>
                        Aujourd&apos;hui
                      </span>
                    )}
                  </div>
                  {myShift && (
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: myShift.color }}>
                      {myShift.start} – {myShift.end}
                    </span>
                  )}
                </div>

                {/* My shift */}
                <div className="px-4 py-2.5">
                  {myShift ? (
                    <div
                      className="rounded-lg px-3 py-2 mb-2"
                      style={{ backgroundColor: `${myShift.color}18`, border: `1px solid ${myShift.color}40` }}
                    >
                      <p className="text-[13px] font-semibold" style={{ color: myShift.color }}>Mon service — {myShift.label}</p>
                      <p className="text-[12px]" style={{ color: myShift.color, opacity: 0.8 }}>{myShift.start} → {myShift.end}</p>
                    </div>
                  ) : (
                    <p className="text-[12px] py-1" style={{ color: 'var(--text-tertiary)' }}>Repos</p>
                  )}

                  {/* Other employees (faded) */}
                  {otherShifts.length > 0 && (
                    <div className="space-y-1 mt-1">
                      {otherShifts.slice(0, 3).map((s, i) => {
                        const emp = employees.find(e => e.id === s.employee_id)
                        return (
                          <div key={i} className="flex items-center gap-2 opacity-30">
                            <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${s.color}20` }}>
                              <span className="text-[7px]" style={{ color: s.color }}>{emp?.initials}</span>
                            </div>
                            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{emp?.name} · {s.start}–{s.end}</span>
                          </div>
                        )
                      })}
                      {otherShifts.length > 3 && (
                        <p className="text-[10px] opacity-30" style={{ color: 'var(--text-tertiary)' }}>+{otherShifts.length - 3} autres</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
