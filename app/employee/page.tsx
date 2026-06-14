'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { LogOut, Coffee, ChevronUp, ChevronDown } from 'lucide-react'
import currentEmployee from '@/data/current-employee.json'

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min ${String(s).padStart(2, '0')}s`
  return `${String(m).padStart(2, '0')}min ${String(s).padStart(2, '0')}s`
}

function demoAction() {
  toast.info('🎭 Mode démo — cette action n\'est pas disponible')
}

function RippleBtn({ color, icon, label, onClick }: {
  color: 'accent' | 'success' | 'danger' | 'warning'
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])

  const styles = {
    accent:  { bg: 'var(--accent)',              color: '#ffffff', border: 'none' },
    success: { bg: 'var(--success)',             color: '#ffffff', border: 'none' },
    danger:  { bg: 'rgba(255,107,107,0.15)',     color: 'var(--danger)',  border: '1px solid rgba(255,107,107,0.3)' },
    warning: { bg: 'rgba(255,179,71,0.15)',      color: 'var(--warning)', border: '1px solid rgba(255,179,71,0.3)' },
  }[color]

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const id = Date.now()
      setRipples(r => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }])
      setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 700)
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(25)
    onClick()
  }

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className="relative w-full flex items-center justify-center gap-2.5 rounded-[16px] font-semibold text-[15px] overflow-hidden transition-all active:scale-[0.98]"
      style={{ height: '56px', backgroundColor: styles.bg, color: styles.color, border: styles.border, fontFamily: 'var(--font-syne)' }}
    >
      {ripples.map(rp => (
        <span key={rp.id} className="badgeuse-ripple" style={{ left: rp.x, top: rp.y }} />
      ))}
      {icon}
      {label}
    </button>
  )
}

function TimePicker({ hour, minute, onHour, onMinute }: { hour: number; minute: number; onHour(h: number): void; onMinute(m: number): void }) {
  const btn = 'p-2 rounded-xl transition-all select-none hover:bg-white/8 active:scale-95'
  return (
    <div className="flex items-center gap-1 justify-center">
      <div className="flex flex-col items-center">
        <button className={btn} onClick={() => onHour((hour + 1) % 24)}>
          <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
        <span className="text-[40px] font-bold tabular-nums w-14 text-center" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
          {String(hour).padStart(2, '0')}
        </span>
        <button className={btn} onClick={() => onHour((hour - 1 + 24) % 24)}>
          <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
      <span className="text-[30px] font-bold mb-1" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-tertiary)' }}>:</span>
      <div className="flex flex-col items-center">
        <button className={btn} onClick={() => onMinute(Math.round(minute / 5 + 1) % 12 * 5)}>
          <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
        <span className="text-[40px] font-bold tabular-nums w-14 text-center" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
          {String(minute).padStart(2, '0')}
        </span>
        <button className={btn} onClick={() => onMinute((Math.round(minute / 5 - 1 + 12) % 12) * 5)}>
          <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
    </div>
  )
}

export default function EmployeeBadgeusePage() {
  const [now, setNow] = useState(new Date())
  const [elapsed, setElapsed] = useState(0)
  const [hm, setHm] = useState({ hour: new Date().getHours(), minute: Math.round(new Date().getMinutes() / 5) * 5 % 60 })

  useEffect(() => {
    // Calculer les secondes écoulées depuis l'heure de pointage
    const clockIn = new Date()
    clockIn.setHours(currentEmployee.clockInHour, currentEmployee.clockInMinute, 0, 0)
    const initial = Math.max(0, Math.floor((Date.now() - clockIn.getTime()) / 1000))
    setElapsed(initial)

    const secTick = setInterval(() => {
      setNow(new Date())
      setElapsed(e => e + 1)
    }, 1000)
    const minTick = setInterval(() => {
      const n = new Date()
      setHm({ hour: n.getHours(), minute: Math.round(n.getMinutes() / 5) * 5 % 60 })
    }, 60000)

    return () => { clearInterval(secTick); clearInterval(minTick) }
  }, [])

  const clockDisplay = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateLabel = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start px-4 pt-6 pb-20"
      style={{ backgroundColor: 'var(--bg-page)' }}
    >
      <div className="w-full max-w-sm space-y-4">

        {/* Clock */}
        <div className="text-center pt-2 pb-1">
          <p
            className="tabular-nums tracking-tight"
            style={{ fontFamily: 'var(--font-syne)', fontSize: '56px', fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)' }}
          >
            {clockDisplay}
          </p>
          <p className="text-[13px] mt-2 capitalize" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-secondary)' }}>
            {dateLabel}
          </p>
        </div>

        {/* Shift band */}
        <div
          className="rounded-xl px-4 py-2.5 flex items-center justify-between text-sm"
          style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}
        >
          <span className="font-medium" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--accent)' }}>
            {currentEmployee.shift.label}
          </span>
          <span className="font-bold tabular-nums" style={{ fontFamily: 'var(--font-syne)', color: 'var(--accent)' }}>
            {currentEmployee.shift.start} → {currentEmployee.shift.end}
          </span>
        </div>

        {/* Status — EN SERVICE */}
        <div
          className="rounded-[20px] p-5 text-center space-y-1"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(0,212,170,0.2)' }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full dot-pulse-green" style={{ backgroundColor: 'var(--success)' }} />
            <span className="text-[12px] font-medium uppercase tracking-[0.08em]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--success)' }}>
              En service
            </span>
          </div>
          <p
            className="text-[36px] font-bold tabular-nums tracking-tight"
            style={{ fontFamily: 'var(--font-syne)', color: 'var(--success)' }}
          >
            {fmt(elapsed)}
          </p>
          <p className="text-[12px]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
            Arrivée à {String(currentEmployee.clockInHour).padStart(2, '0')}:{String(currentEmployee.clockInMinute).padStart(2, '0')}
          </p>
        </div>

        {/* Time picker */}
        <div
          className="rounded-[20px] p-5"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p className="text-center text-[11px] uppercase tracking-[0.06em] mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
            Heure de pointage
          </p>
          <TimePicker
            hour={hm.hour} minute={hm.minute}
            onHour={h => setHm(v => ({ ...v, hour: h }))}
            onMinute={m => setHm(v => ({ ...v, minute: m }))}
          />
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <RippleBtn
            color="warning"
            icon={<Coffee className="h-5 w-5" />}
            label="Début de pause"
            onClick={demoAction}
          />
          <RippleBtn
            color="danger"
            icon={<LogOut className="h-5 w-5" />}
            label="Pointer mon départ"
            onClick={demoAction}
          />
        </div>

        {/* Employee info */}
        <div className="text-center">
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-dm-sans)' }}>
            Connecté en tant que <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{currentEmployee.name}</span> · {currentEmployee.role}
          </p>
        </div>

      </div>
    </div>
  )
}
