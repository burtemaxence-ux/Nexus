'use client'

import { useState, useEffect, useCallback } from 'react'
import { LogIn, LogOut, Coffee, PlayCircle, CalendarX, ChevronUp, ChevronDown, Check } from 'lucide-react'

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

// ── Mini time picker ──────────────────────────────────────────────────────────
interface TimePickerProps { hour: number; minute: number; onHour(h: number): void; onMinute(m: number): void }
function TimePicker({ hour, minute, onHour, onMinute }: TimePickerProps) {
  const btn = 'p-2 rounded-xl hover:bg-white/60 active:scale-95 transition-all text-muted-foreground hover:text-foreground select-none'
  return (
    <div className="flex items-center gap-1 justify-center">
      <div className="flex flex-col items-center">
        <button className={btn} onClick={() => onHour((hour + 1) % 24)}><ChevronUp className="h-4 w-4" /></button>
        <span className="text-4xl font-bold tabular-nums text-foreground w-14 text-center">{String(hour).padStart(2, '0')}</span>
        <button className={btn} onClick={() => onHour((hour - 1 + 24) % 24)}><ChevronDown className="h-4 w-4" /></button>
      </div>
      <span className="text-3xl font-bold text-muted-foreground mb-1">:</span>
      <div className="flex flex-col items-center">
        <button className={btn} onClick={() => onMinute(Math.round(minute / 5 + 1) % 12 * 5)}><ChevronUp className="h-4 w-4" /></button>
        <span className="text-4xl font-bold tabular-nums text-foreground w-14 text-center">{String(minute).padStart(2, '0')}</span>
        <button className={btn} onClick={() => onMinute((Math.round(minute / 5 - 1 + 12) % 12) * 5)}><ChevronDown className="h-4 w-4" /></button>
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

  const [hm, setHm] = useState(nowHM())
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
    const tick = setInterval(() => { setNow(new Date()); setHm(nowHM()) }, 60000)
    return () => clearInterval(tick)
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start px-4 pt-8 pb-16">
      <div className="w-full max-w-sm space-y-5">

        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>Badgeuse</h1>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">{dateLabel}</p>
        </div>

        {/* Horloge */}
        <div className="text-center">
          <p className="text-6xl font-bold tabular-nums text-foreground tracking-tight">
            {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : shifts.length === 0 && state === 'idle' ? (
          /* Pas de service */
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center space-y-3">
            <CalendarX className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="font-semibold text-muted-foreground">Pas de service aujourd&apos;hui</p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              Aucun créneau planifié pour vous ce jour.
            </p>
          </div>
        ) : (
          <>
            {/* Confirmation flash */}
            {confirmed && (
              <div className="rounded-xl px-4 py-2.5 flex items-center gap-2" style={{ background: '#F0FDF4', border: '0.5px solid #BBF7D0' }}>
                <Check className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                <span className="text-[13px] font-medium text-emerald-700">Pointage enregistré</span>
              </div>
            )}

            {/* Lateness warning */}
            {latenessMinutes > 2 && state !== 'done' && (
              <div className="rounded-xl px-4 py-2.5 flex items-center gap-2" style={{ background: '#FEF3C7', border: '0.5px solid var(--warning)' }}>
                <span className="text-[13px] font-medium" style={{ color: 'var(--warning)' }}>
                  En retard de {fmt(latenessMinutes)}
                </span>
              </div>
            )}

            {/* Service prévu */}
            {shifts.length > 0 && (
              <div className="rounded-xl px-4 py-2.5 flex items-center justify-between text-sm" style={{ backgroundColor: 'var(--accent-light)', border: '0.5px solid var(--accent)' }}>
                <span className="font-medium" style={{ color: 'var(--accent)' }}>Service prévu</span>
                <span className="font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
                  {shifts[0].start_time.slice(0, 5)} – {shifts[0].end_time.slice(0, 5)}
                </span>
              </div>
            )}

            {/* DONE */}
            {state === 'done' && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <p className="text-sm font-semibold text-foreground text-center">Journée terminée ✓</p>
                <div className="space-y-2 text-sm">
                  <Row label="Arrivée" value={formatTime(p!.clock_in)} />
                  {p!.break_minutes_used > 0 && <Row label="Pause" value={fmt(p!.break_minutes_used)} />}
                  <Row label="Départ" value={formatTime(p!.clock_out)} />
                  <div className="border-t border-border pt-2 mt-1">
                    <Row label="Total travaillé" value={fmt(minutesWorked)} bold />
                  </div>
                </div>
              </div>
            )}

            {/* Résumé arrivée */}
            {(state === 'working' || state === 'after_break' || state === 'on_break') && (
              <div className="flex gap-2">
                <Chip color="emerald" label="Arrivée" value={formatTime(p!.clock_in)} />
                {minutesWorked > 0 && <Chip color="primary" label="Travaillé" value={fmt(minutesWorked)} />}
              </div>
            )}

            {/* Pause en cours */}
            {state === 'on_break' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center space-y-2">
                <p className="text-sm font-semibold text-amber-700">En pause depuis {formatTime(p!.break_start)}</p>
                <BreakBar used={breakTotal} limit={breakLimit} />
                <p className="text-xs text-amber-600">
                  {breakFull ? <span className="text-red-500 font-semibold">Quota atteint</span> : `${breakRemaining} min restantes`}
                </p>
              </div>
            )}

            {/* Résumé pause précédente */}
            {state === 'after_break' && p!.break_minutes_used > 0 && (
              <div className="space-y-1.5">
                <BreakBar used={p!.break_minutes_used} limit={breakLimit} />
                <p className="text-[11px] text-center text-muted-foreground">{p!.break_minutes_used} / {breakLimit} min de pause utilisées</p>
              </div>
            )}

            {/* Sélecteur d'heure */}
            {state !== 'done' && state !== 'on_break' && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <TimePicker
                  hour={hm.hour} minute={hm.minute}
                  onHour={h => setHm(v => ({ ...v, hour: h }))}
                  onMinute={m => setHm(v => ({ ...v, minute: m }))}
                />
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2.5">
              {state === 'idle' && (
                <ActionBtn color="emerald" icon={<LogIn className="h-5 w-5" />} label="Pointer mon arrivée" action="clock-in" loading={loading} onPress={post} />
              )}
              {(state === 'working') && (
                <>
                  <ActionBtn color="amber" icon={<Coffee className="h-5 w-5" />} label="Début de pause" action="break-start" loading={loading} onPress={post} />
                  <ActionBtn color="red" icon={<LogOut className="h-5 w-5" />} label="Pointer mon départ" action="clock-out" loading={loading} onPress={post} />
                </>
              )}
              {state === 'after_break' && (
                <>
                  {!breakFull && (
                    <ActionBtn color="amber" icon={<Coffee className="h-5 w-5" />} label={`Reprendre une pause (${breakRemaining} min)`} action="break-start" loading={loading} onPress={post} />
                  )}
                  <ActionBtn color="red" icon={<LogOut className="h-5 w-5" />} label="Pointer mon départ" action="clock-out" loading={loading} onPress={post} />
                </>
              )}
              {state === 'on_break' && (
                <ActionBtn color="emerald" icon={<PlayCircle className="h-5 w-5" />} label="Fin de pause — reprendre le travail" action="break-end" loading={loading} onPress={post} />
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive text-center bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ color, icon, label, action, loading, onPress }: {
  color: 'emerald' | 'red' | 'amber'
  icon: React.ReactNode
  label: string
  action: string
  loading: string | null
  onPress: (a: string) => void
}) {
  const cls = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    red:     'bg-red-500 hover:bg-red-600',
    amber:   'bg-amber-500 hover:bg-amber-600',
  }[color]

  return (
    <button
      onClick={() => {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(25)
        onPress(action)
      }}
      disabled={loading !== null}
      className={`w-full h-13 flex items-center justify-center gap-2.5 rounded-2xl text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 ${cls}`}
      style={{ height: '52px' }}
    >
      {icon}
      {loading === action ? 'Pointage…' : label}
    </button>
  )
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${bold ? 'font-bold text-foreground' : 'text-foreground/80'}`}>{value}</span>
    </div>
  )
}

function Chip({ color, label, value }: { color: 'emerald' | 'primary'; label: string; value: string }) {
  const style = color === 'emerald'
    ? { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', color: '#15803D' }
    : { backgroundColor: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--accent)' }
  return (
    <div className="flex-1 rounded-xl px-3 py-2 flex justify-between items-center text-sm" style={{ border: `0.5px solid ${style.borderColor}`, backgroundColor: style.backgroundColor, color: style.color }}>
      <span className="font-medium">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  )
}

function BreakBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100))
  return (
    <div className="w-full bg-amber-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-red-400' : 'bg-amber-400'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
