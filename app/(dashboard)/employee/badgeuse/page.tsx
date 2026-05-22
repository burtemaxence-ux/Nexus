'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, LogIn, LogOut, Coffee, PlayCircle, CalendarX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TimeCarousel, timeValueToISO, nowTimeValue, type TimeValue } from '@/components/ui/time-carousel'

type Presence = {
  id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  break_start: string | null
  break_end: string | null
}

type Shift = {
  id: string
  start_time: string
  end_time: string
  position: string | null
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function minutesBetween(from: string, to: string | null): number {
  const end = to ? new Date(to) : new Date()
  return Math.floor((end.getTime() - new Date(from).getTime()) / 60000)
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
  const [todayShifts, setTodayShifts] = useState<Shift[] | undefined>(undefined)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())

  const [clockInTime, setClockInTime] = useState<TimeValue>(nowTimeValue())
  const [breakStartTime, setBreakStartTime] = useState<TimeValue>(nowTimeValue())
  const [breakEndTime, setBreakEndTime] = useState<TimeValue>(nowTimeValue())
  const [clockOutTime, setClockOutTime] = useState<TimeValue>(nowTimeValue())

  const fetchData = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10)

    const [presRes, shiftsRes] = await Promise.all([
      fetch('/api/presences'),
      fetch(`/api/shifts?employee=me&date=${today}`),
    ])

    if (presRes.ok) setPresence(await presRes.json())
    else setPresence(null)

    if (shiftsRes.ok) setTodayShifts(await shiftsRes.json())
    else setTodayShifts([])
  }, [])

  useEffect(() => {
    fetchData()
    const tick = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(tick)
  }, [fetchData])

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
  const hasShiftToday = todayShifts !== undefined && todayShifts.length > 0

  // Durée totale travaillée (sans la pause)
  const minutesWorked = p?.clock_in
    ? minutesBetween(p.clock_in, p.clock_out ?? null) -
      (p.break_start && p.break_end
        ? minutesBetween(p.break_start, p.break_end)
        : p.break_start && !p.break_end
        ? minutesBetween(p.break_start, null)
        : 0)
    : 0

  const isLoading = presence === undefined || todayShifts === undefined

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

      {/* Horloge */}
      <div className="text-center mb-6">
        <p className="text-5xl font-bold text-gray-900 tabular-nums">
          {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 py-8">Chargement…</p>
      ) : !hasShiftToday && state === 'idle' ? (
        /* Pas de service aujourd'hui */
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center space-y-3">
          <CalendarX className="h-10 w-10 text-gray-300 mx-auto" />
          <p className="text-base font-semibold text-gray-500">Pas de service aujourd&apos;hui</p>
          <p className="text-sm text-gray-400">
            Aucun créneau n&apos;est planifié pour vous ce jour. La badgeuse est disponible uniquement les jours de travail.
          </p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Shifts du jour */}
          {todayShifts && todayShifts.length > 0 && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="text-blue-600 font-medium">Service prévu</span>
              <span className="text-blue-700 font-bold tabular-nums">
                {todayShifts[0].start_time.slice(0, 5)} – {todayShifts[0].end_time.slice(0, 5)}
              </span>
            </div>
          )}

          {/* IDLE */}
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

          {/* WORKING ou AFTER_BREAK */}
          {(state === 'working' || state === 'after_break') && (
            <>
              <SummaryRow label="Arrivée" time={formatTime(p!.clock_in)} color="green" />

              {state === 'after_break' && (
                <SummaryRow
                  label={`Pause  ${formatTime(p!.break_start)} → ${formatTime(p!.break_end)}`}
                  time={formatDuration(minutesBetween(p!.break_start!, p!.break_end))}
                  color="amber"
                />
              )}

              {/* Pause — toujours disponible si shift aujourd'hui */}
              {state === 'working' && (
                <ActionCard
                  title="Début de pause"
                  color="amber"
                  icon={<Coffee className="h-5 w-5" />}
                  carousel={<TimeCarousel value={breakStartTime} onChange={setBreakStartTime} label="Heure de pause" compact />}
                  onConfirm={() => post('break-start', breakStartTime)}
                  loading={loading === 'break-start'}
                />
              )}

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

          {/* ON_BREAK */}
          {state === 'on_break' && (
            <>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-sm font-semibold text-amber-700">En pause depuis {formatTime(p!.break_start)}</p>
                <p className="text-xs text-amber-500 mt-1">
                  {formatDuration(minutesBetween(p!.break_start!, null))} de pause
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

          {/* DONE */}
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
                <DaySummaryRow label="Total travaillé" value={formatDuration(minutesWorked)} bold />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        </div>
      )}
    </div>
  )
}

type CardColor = 'green' | 'red' | 'amber'
const COLOR_MAP: Record<CardColor, { btn: string; border: string }> = {
  green: { btn: 'bg-green-600 hover:bg-green-700', border: 'border-green-200' },
  red:   { btn: 'bg-red-500 hover:bg-red-600',     border: 'border-red-200' },
  amber: { btn: 'bg-amber-500 hover:bg-amber-600', border: 'border-amber-200' },
}

function ActionCard({ title, color, icon, carousel, onConfirm, loading }: {
  title: string; color: CardColor; icon: React.ReactNode
  carousel: React.ReactNode; onConfirm: () => void; loading: boolean
}) {
  const c = COLOR_MAP[color]
  return (
    <div className={`rounded-xl border bg-white p-4 space-y-4 ${c.border}`}>
      <div className="flex justify-center">{carousel}</div>
      <Button onClick={onConfirm} disabled={loading} className={`w-full h-12 gap-2 text-white ${c.btn}`}>
        {icon}{loading ? 'Pointage…' : title}
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
