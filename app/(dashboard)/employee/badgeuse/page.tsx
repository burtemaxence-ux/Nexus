'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { LogIn, LogOut, Coffee, PlayCircle, CalendarX, ChevronUp, ChevronDown } from 'lucide-react'

type Presence = {
  id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  break_start: string | null
  break_end: string | null
  break_minutes_used: number
}

type Shift = {
  id: string
  start_time: string
  end_time: string
  position: string | null
}

type DayState = 'idle' | 'working' | 'on_break' | 'after_break' | 'done'

function getDayState(p: Presence | null): DayState {
  if (!p?.clock_in) return 'idle'
  if (p.clock_out) return 'done'
  if (p.break_start && !p.break_end) return 'on_break'
  if (p.break_start && p.break_end) return 'after_break'
  return 'working'
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function minutesBetween(from: string, to: string | null): number {
  return Math.floor(((to ? new Date(to) : new Date()).getTime() - new Date(from).getTime()) / 60000)
}

function fmt(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60)
  const m = Math.abs(minutes) % 60
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

function fmtElapsed(from: string, to: Date): string {
  const s = Math.max(0, Math.floor((to.getTime() - new Date(from).getTime()) / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ── Mini time picker ──────────────────────────────────────────────────────────
interface TimePickerProps { hour: number; minute: number; onHour(h: number): void; onMinute(m: number): void }
function TimePicker({ hour, minute, onHour, onMinute }: TimePickerProps) {
  const btn = 'p-2 rounded-xl transition-all select-none hover:bg-white/8 active:scale-95'
  return (
    <div className="flex items-center gap-1 justify-center">
      <div className="flex flex-col items-center">
        <button className={btn} onClick={() => onHour((hour + 1) % 24)}>
          <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
        <span
          className="text-[40px] font-bold tabular-nums w-14 text-center"
          style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}
        >
          {String(hour).padStart(2, '0')}
        </span>
        <button className={btn} onClick={() => onHour((hour - 1 + 24) % 24)}>
          <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
      <span
        className="text-[30px] font-bold mb-1"
        style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-tertiary)' }}
      >:
      </span>
      <div className="flex flex-col items-center">
        <button className={btn} onClick={() => onMinute(Math.round(minute / 5 + 1) % 12 * 5)}>
          <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
        <span
          className="text-[40px] font-bold tabular-nums w-14 text-center"
          style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}
        >
          {String(minute).padStart(2, '0')}
        </span>
        <button className={btn} onClick={() => onMinute((Math.round(minute / 5 - 1 + 12) % 12) * 5)}>
          <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
    </div>
  )
}

function nowHM() { const n = new Date(); return { hour: n.getHours(), minute: Math.round(n.getMinutes() / 5) * 5 % 60 } }
function hmToISO(h: number, m: number): string {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export default function BadgeusePage() {
  const [presence, setPresence] = useState<Presence | null | undefined>(undefined)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [breakLimit, setBreakLimit] = useState(30)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())

  const [hm, setHm] = useState<{ hour: number; minute: number }>(nowHM())
  const [confirmed, setConfirmed] = useState(false)

  const fetchData = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10)
    const [presRes, shiftsRes, settingsRes] = await Promise.all([
      fetch('/api/presences'),
      fetch(`/api/shifts?employee=me&date=${today}`),
      fetch('/api/settings'),
    ])
    if (presRes.ok) setPresence(await presRes.json())
    else setPresence(null)
    if (shiftsRes.ok) setShifts(await shiftsRes.json())
    if (settingsRes.ok) {
      const s = await settingsRes.json()
      setBreakLimit(parseInt(s.break_minutes_limit ?? '30', 10))
    }
  }, [])

  useEffect(() => {
    fetchData()
    const secTick = setInterval(() => setNow(new Date()), 1000)
    const minTick = setInterval(() => setHm(nowHM()), 60000)
    return () => { clearInterval(secTick); clearInterval(minTick) }
  }, [fetchData])

  async function post(endpoint: string) {
    setLoading(endpoint)
    setError(null)
    const res = await fetch(`/api/presences/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time: hmToISO(hm.hour, hm.minute) }),
    })
    if (res.ok) {
      setPresence(await res.json())
      setHm(nowHM())
      setConfirmed(true)
      setTimeout(() => setConfirmed(false), 1800)
    } else { const b = await res.json().catch(() => ({})); setError(b.error ?? 'Erreur de pointage') }
    setLoading(null)
  }

  const p = presence ?? null
  const state = getDayState(p)
  const isLoading = presence === undefined

  const breakTotal = (p?.break_minutes_used ?? 0) +
    (state === 'on_break' && p?.break_start ? minutesBetween(p.break_start, null) : 0)
  const breakRemaining = Math.max(0, breakLimit - breakTotal)
  const breakFull = breakRemaining === 0

  const minutesWorked = p?.clock_in
    ? minutesBetween(p.clock_in, p.clock_out ?? null) - (p.break_minutes_used ?? 0) -
      (state === 'on_break' && p.break_start ? minutesBetween(p.break_start, null) : 0)
    : 0

  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const latenessMinutes = (state !== 'idle' && p?.clock_in && shifts.length > 0)
    ? (() => {
        const [sh, sm] = shifts[0].start_time.split(':').map(Number)
        const ci = new Date(p.clock_in)
        return ci.getHours() * 60 + ci.getMinutes() - sh * 60 - sm
      })()
    : 0

  const clockDisplay = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start px-4 pt-6 pb-20"
      style={{ backgroundColor: state === 'done' ? 'var(--bg-input)' : 'var(--bg-page)' }}
    >
      <div className="w-full max-w-sm space-y-4">

        {/* ── CLOCK HEADER ── */}
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
        {shifts.length > 0 && (
          <div
            className="rounded-xl px-4 py-2.5 flex items-center justify-between text-sm"
            style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)' }}
          >
            <span className="font-medium" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--accent)' }}>
              {shifts[0].position ?? 'Service prévu'}
            </span>
            <span className="font-bold tabular-nums" style={{ fontFamily: 'var(--font-syne)', color: 'var(--accent)' }}>
              {shifts[0].start_time.slice(0, 5)} → {shifts[0].end_time.slice(0, 5)}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : shifts.length === 0 && state === 'idle' ? (
          /* ── NO SERVICE ── */
          <div
            className="rounded-[20px] p-10 text-center space-y-3"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border)' }}
          >
            <CalendarX className="h-10 w-10 mx-auto" style={{ color: 'var(--text-tertiary)' }} />
            <p className="font-semibold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>
              Pas de service aujourd&apos;hui
            </p>
            <p className="text-[12px] leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
              Aucun créneau planifié pour vous ce jour.
            </p>
          </div>
        ) : (
          <>
            {/* Confirmation flash */}
            {confirmed && (
              <div
                className="rounded-xl px-4 py-2.5 flex items-center gap-2"
                style={{ backgroundColor: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)' }}
              >
                <span className="text-[13px] font-medium" style={{ color: 'var(--success)' }}>✓ Pointage enregistré</span>
              </div>
            )}

            {/* Lateness warning */}
            {latenessMinutes > 2 && state !== 'done' && (
              <div
                className="rounded-xl px-4 py-2.5"
                style={{ backgroundColor: 'rgba(255,179,71,0.1)', border: '1px solid rgba(255,179,71,0.25)' }}
              >
                <span className="text-[13px] font-medium" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--warning)' }}>
                  En retard de {fmt(latenessMinutes)}
                </span>
              </div>
            )}

            {/* ── STATE: WORKING / AFTER_BREAK — elapsed timer ── */}
            {(state === 'working' || state === 'after_break') && p?.clock_in && (
              <div
                className="rounded-[20px] p-5 text-center space-y-1"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(0,212,170,0.2)' }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span
                    className="w-2 h-2 rounded-full dot-pulse-green"
                    style={{ backgroundColor: 'var(--success)' }}
                  />
                  <span className="text-[12px] font-medium uppercase tracking-[0.08em]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--success)' }}>
                    En service
                  </span>
                </div>
                <p
                  className="text-[36px] font-bold tabular-nums tracking-tight"
                  style={{ fontFamily: 'var(--font-syne)', color: 'var(--success)' }}
                >
                  {fmtElapsed(p.clock_in, now)}
                </p>
                <p className="text-[12px]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
                  Arrivée à {formatTime(p.clock_in)}
                </p>
              </div>
            )}

            {/* ── STATE: ON_BREAK — break timer ── */}
            {state === 'on_break' && p?.break_start && (
              <div
                className="rounded-[20px] p-5 text-center space-y-3"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(255,179,71,0.2)' }}
              >
                <div className="flex items-center justify-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full dot-pulse-yellow"
                    style={{ backgroundColor: 'var(--warning)' }}
                  />
                  <span className="text-[12px] font-medium uppercase tracking-[0.08em]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--warning)' }}>
                    En pause
                  </span>
                </div>
                <p
                  className="text-[36px] font-bold tabular-nums tracking-tight"
                  style={{ fontFamily: 'var(--font-syne)', color: 'var(--warning)' }}
                >
                  {fmtElapsed(p.break_start, now)}
                </p>
                <BreakBar used={breakTotal} limit={breakLimit} />
                <p className="text-[12px]" style={{ fontFamily: 'var(--font-dm-sans)', color: breakFull ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                  {breakFull ? 'Quota atteint' : `${breakRemaining} min restantes`}
                </p>
              </div>
            )}

            {/* Break summary (after_break) */}
            {state === 'after_break' && p!.break_minutes_used > 0 && (
              <div className="space-y-1.5">
                <BreakBar used={p!.break_minutes_used} limit={breakLimit} />
                <p className="text-[11px] text-center" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
                  {p!.break_minutes_used} / {breakLimit} min de pause utilisées
                </p>
              </div>
            )}

            {/* ── STATE: DONE ── */}
            {state === 'done' && (
              <div
                className="rounded-[20px] p-6 space-y-4"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <p
                  className="text-center text-[16px] font-bold"
                  style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}
                >
                  Bonne fin de journée 👏
                </p>
                <div className="space-y-2.5">
                  <Row label="Arrivée" value={formatTime(p!.clock_in)} />
                  {p!.break_minutes_used > 0 && <Row label="Pause" value={fmt(p!.break_minutes_used)} />}
                  <Row label="Départ" value={formatTime(p!.clock_out)} />
                  <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <Row label="Total travaillé" value={fmt(minutesWorked)} bold />
                  </div>
                </div>
              </div>
            )}

            {/* ── TIME PICKER ── */}
            {state !== 'done' && state !== 'on_break' && (
              <div
                className="rounded-[20px] p-5"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <p className="text-center text-[11px] uppercase tracking-[0.06em] mb-3" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
                  Heure de pointage
                </p>
                <TimePicker
                  hour={hm.hour} minute={hm.minute}
                  onHour={h => setHm((v: { hour: number; minute: number }) => ({ ...v, hour: h }))}
                  onMinute={m => setHm((v: { hour: number; minute: number }) => ({ ...v, minute: m }))}
                />
              </div>
            )}

            {/* ── ACTIONS ── */}
            <div className="space-y-2.5">
              {state === 'idle' && (
                <RippleBtn
                  color="accent"
                  icon={<LogIn className="h-5 w-5" />}
                  label="Pointer mon arrivée"
                  action="clock-in"
                  loading={loading}
                  onPress={post}
                />
              )}
              {state === 'working' && (
                <>
                  <RippleBtn color="warning" icon={<Coffee className="h-5 w-5" />} label="Début de pause" action="break-start" loading={loading} onPress={post} />
                  <RippleBtn color="danger" icon={<LogOut className="h-5 w-5" />} label="Pointer mon départ" action="clock-out" loading={loading} onPress={post} />
                </>
              )}
              {state === 'after_break' && (
                <>
                  {!breakFull && (
                    <RippleBtn color="warning" icon={<Coffee className="h-5 w-5" />} label={`Reprendre une pause (${breakRemaining} min)`} action="break-start" loading={loading} onPress={post} />
                  )}
                  <RippleBtn color="danger" icon={<LogOut className="h-5 w-5" />} label="Pointer mon départ" action="clock-out" loading={loading} onPress={post} />
                </>
              )}
              {state === 'on_break' && (
                <RippleBtn color="success" icon={<PlayCircle className="h-5 w-5" />} label="Fin de pause — reprendre le travail" action="break-end" loading={loading} onPress={post} />
              )}
            </div>

            {error && (
              <p
                className="text-sm text-center rounded-xl px-3 py-2"
                style={{ color: 'var(--danger)', backgroundColor: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)' }}
              >
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Ripple button ─────────────────────────────────────────────────────────────

function RippleBtn({ color, icon, label, action, loading, onPress }: {
  color: 'accent' | 'success' | 'danger' | 'warning'
  icon: React.ReactNode
  label: string
  action: string
  loading: string | null
  onPress: (a: string) => void
}) {
  const rippleRef = useRef<HTMLButtonElement>(null)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])

  const bg = {
    accent:  'var(--accent)',
    success: 'var(--success)',
    danger:  'rgba(255,107,107,0.15)',
    warning: 'rgba(255,179,71,0.15)',
  }[color]

  const textColor = {
    accent:  '#ffffff',
    success: '#ffffff',
    danger:  'var(--danger)',
    warning: 'var(--warning)',
  }[color]

  const border = {
    accent:  'none',
    success: 'none',
    danger:  '1px solid rgba(255,107,107,0.3)',
    warning: '1px solid rgba(255,179,71,0.3)',
  }[color]

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (rippleRef.current) {
      const rect = rippleRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const id = Date.now()
      setRipples((r: { id: number; x: number; y: number }[]) => [...r, { id, x, y }])
      setTimeout(() => setRipples((r: { id: number; x: number; y: number }[]) => r.filter(rp => rp.id !== id)), 700)
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(25)
    onPress(action)
  }

  return (
    <button
      ref={rippleRef}
      onClick={handleClick}
      disabled={loading !== null}
      className="relative w-full flex items-center justify-center gap-2.5 rounded-[16px] font-semibold text-[15px] overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50"
      style={{ height: '56px', backgroundColor: bg, color: textColor, border, fontFamily: 'var(--font-syne)' }}
    >
      {ripples.map(rp => (
        <span key={rp.id} className="badgeuse-ripple" style={{ left: rp.x, top: rp.y }} />
      ))}
      {icon}
      {loading === action ? 'Pointage…' : label}
    </button>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[13px]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-secondary)' }}>{label}</span>
      <span
        className="tabular-nums text-[14px]"
        style={{ fontFamily: 'var(--font-syne)', color: bold ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: bold ? 700 : 400 }}
      >
        {value}
      </span>
    </div>
  )
}

function BreakBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100))
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.06)' }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? 'var(--danger)' : 'var(--warning)' }}
      />
    </div>
  )
}
