'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, LogIn, LogOut, Coffee, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TimeCarousel, timeValueToISO, isoToTimeValue, nowTimeValue, type TimeValue } from '@/components/ui/time-carousel'

type Presence = {
  id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  break_start: string | null
  break_end: string | null
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function minutesSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

function formatDate(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// État de la journée
type DayState = 'idle' | 'working' | 'on_break' | 'after_break' | 'done'

function getDayState(p: Presence | null): DayState {
  if (!p?.clock_in) return 'idle'
  if (p.clock_out) return 'done'
  if (p.break_start && !p.break_end) return 'on_break'
  if (p.break_start && p.break_end) return 'after_break'
  return 'working'
}

export default function BadgeusePage() {
  const [presence, setPresence] = useState<Presence | null | undefined>(undefined)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())

  // Carousel times — initialisés à l'heure courante
  const [clockInTime, setClockInTime] = useState<TimeValue>(nowTimeValue())
  const [breakStartTime, setBreakStartTime] = useState<TimeValue>(nowTimeValue())
  const [breakEndTime, setBreakEndTime] = useState<TimeValue>(nowTimeValue())
  const [clockOutTime, setClockOutTime] = useState<TimeValue>(nowTimeValue())

  const fetchPresence = useCallback(async () => {
    const res = await fetch('/api/presences')
    if (res.ok) setPresence(await res.json())
    else setPresence(null)
  }, [])

  useEffect(() => {
    fetchPresence()
    const tick = setInterval(() => {
      setNow(new Date())
      // Sync les carousels non encore utilisés à l'heure courante
      setPresence(prev => {
        const state = getDayState(prev ?? null)
        if (state === 'idle') setClockInTime(nowTimeValue())
        return prev
      })
    }, 60000)
    return () => clearInterval(tick)
  }, [fetchPresence])

  async function post(endpoint: string, time: TimeValue) {
    setLoading(endpoint)
    setError(null)
    const res = await fetch(`/api/presences/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time: timeValueToISO(time) }),
    })
    if (res.ok) setPresence(await res.json())
    else setError('Erreur lors du pointage. Réessayez.')
    setLoading(null)
  }

  const p = presence ?? null
  const state = getDayState(p)

  // Minutes travaillées depuis l'arrivée (hors pause)
  const minutesWorked = p?.clock_in
    ? minutesSince(p.clock_in) -
      (p.break_start && p.break_end
        ? Math.floor((new Date(p.break_end).getTime() - new Date(p.break_start).getTime()) / 60000)
        : p.break_start
        ? minutesSince(p.break_start)
        : 0)
    : 0

  const breakAllowed = minutesWorked >= 420 // 7h = 420 min

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <div className="mb-6">
        <Link href="/employee" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />Mon espace
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Badgeuse</h1>
        <p className="text-gray-500 mt-0.5 text-sm capitalize">{formatDate()}</p>
      </div>

      {/* Horloge live */}
      <div className="text-center mb-6">
        <p className="text-5xl font-bold text-gray-900 tabular-nums">
          {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {presence === undefined ? (
        <p className="text-center text-gray-400 py-8">Chargement…</p>
      ) : (
        <div className="space-y-4">

          {/* ── IDLE : pas encore pointé ── */}
          {state === 'idle' && (
            <ActionCard
              title="Pointer mon arrivée"
              color="green"
              icon={<LogIn className="h-5 w-5" />}
              carousel={<TimeCarousel value={clockInTime} onChange={setClockInTime} label="Heure d'arrivée" />}
              onConfirm={() => post('clock-in', clockInTime)}
              loading={loading === 'clock-in'}
            />
          )}

          {/* ── WORKING / AFTER BREAK : en service ── */}
          {(state === 'working' || state === 'after_break') && (
            <>
              {/* Résumé arrivée */}
              <SummaryRow
                label="Arrivée"
                time={formatTime(p!.clock_in)}
                color="green"
              />

              {/* Résumé pause (si after_break) */}
              {state === 'after_break' && (
                <SummaryRow
                  label={`Pause  ${formatTime(p!.break_start)} → ${formatTime(p!.break_end)}`}
                  time={formatDuration(
                    Math.floor((new Date(p!.break_end!).getTime() - new Date(p!.break_start!).getTime()) / 60000)
                  )}
                  color="amber"
                />
              )}

              {/* Bloc pause — grisé si < 7h */}
              {state === 'working' && (
                <ActionCard
                  title="Début de pause"
                  color="amber"
                  icon={<Coffee className="h-5 w-5" />}
                  carousel={<TimeCarousel value={breakStartTime} onChange={setBreakStartTime} label="Heure de pause" compact />}
                  onConfirm={() => post('break-start', breakStartTime)}
                  loading={loading === 'break-start'}
                  disabled={!breakAllowed}
                  disabledReason={`Disponible après 7h de service (${formatDuration(minutesWorked)} travaillé${minutesWorked >= 60 ? 's' : ''})`}
                />
              )}

              {/* Départ */}
              <ActionCard
                title="Pointer mon départ"
                color="red"
                icon={<LogOut className="h-5 w-5" />}
                carousel={<TimeCarousel value={clockOutTime} onChange={setClockOutTime} label="Heure de départ" compact />}
                onConfirm={() => post('clock-out', clockOutTime)}
                loading={loading === 'clock-out'}
              />
            </>
          )}

          {/* ── ON BREAK : en pause ── */}
          {state === 'on_break' && (
            <>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-sm font-semibold text-amber-700">En pause depuis {formatTime(p!.break_start)}</p>
                <p className="text-xs text-amber-500 mt-1">
                  {formatDuration(minutesSince(p!.break_start!))} de pause
                </p>
              </div>
              <ActionCard
                title="Fin de pause"
                color="green"
                icon={<PlayCircle className="h-5 w-5" />}
                carousel={<TimeCarousel value={breakEndTime} onChange={setBreakEndTime} label="Fin de pause" compact />}
                onConfirm={() => post('break-end', breakEndTime)}
                loading={loading === 'break-end'}
              />
            </>
          )}

          {/* ── DONE : journée terminée ── */}
          {state === 'done' && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-5 space-y-3">
              <p className="text-sm font-semibold text-gray-700 text-center mb-2">Journée terminée</p>
              <DaySummaryRow label="Arrivée" value={formatTime(p!.clock_in)} />
              {p!.break_start && (
                <DaySummaryRow
                  label="Pause"
                  value={`${formatTime(p!.break_start)} → ${formatTime(p!.break_end)}`}
                />
              )}
              <DaySummaryRow label="Départ" value={formatTime(p!.clock_out)} />
              <div className="border-t pt-2">
                <DaySummaryRow
                  label="Total travaillé"
                  value={formatDuration(minutesWorked)}
                  bold
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Composants internes ──────────────────────────────────────────────────────

type CardColor = 'green' | 'red' | 'amber'

const COLOR_MAP: Record<CardColor, { btn: string; border: string }> = {
  green: { btn: 'bg-green-600 hover:bg-green-700', border: 'border-green-200' },
  red:   { btn: 'bg-red-500 hover:bg-red-600',     border: 'border-red-200' },
  amber: { btn: 'bg-amber-500 hover:bg-amber-600', border: 'border-amber-200' },
}

function ActionCard({
  title, color, icon, carousel, onConfirm, loading, disabled = false, disabledReason,
}: {
  title: string
  color: CardColor
  icon: React.ReactNode
  carousel: React.ReactNode
  onConfirm: () => void
  loading: boolean
  disabled?: boolean
  disabledReason?: string
}) {
  const c = COLOR_MAP[color]
  return (
    <div className={`rounded-xl border bg-white p-4 space-y-4 ${disabled ? 'opacity-50' : c.border}`}>
      <div className="flex justify-center">
        {carousel}
      </div>
      {disabledReason && (
        <p className="text-xs text-center text-gray-400 italic">{disabledReason}</p>
      )}
      <Button
        onClick={onConfirm}
        disabled={loading || disabled}
        className={`w-full h-12 gap-2 text-white ${c.btn}`}
      >
        {icon}
        {loading ? 'Pointage…' : title}
      </Button>
    </div>
  )
}

function SummaryRow({ label, time, color }: { label: string; time: string; color: 'green' | 'amber' }) {
  const cls = color === 'green'
    ? 'bg-green-50 border-green-100 text-green-700'
    : 'bg-amber-50 border-amber-100 text-amber-700'
  return (
    <div className={`rounded-lg border px-4 py-2 flex items-center justify-between text-sm ${cls}`}>
      <span className="font-medium">{label}</span>
      <span className="font-bold tabular-nums">{time}</span>
    </div>
  )
}

function DaySummaryRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`tabular-nums ${bold ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{value}</span>
    </div>
  )
}
