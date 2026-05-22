'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, LogIn, LogOut, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Presence = {
  id: string
  date: string
  clock_in: string | null
  clock_out: string | null
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(clockIn: string, clockOut: string | null): string {
  const end = clockOut ? new Date(clockOut) : new Date()
  const diffMs = end.getTime() - new Date(clockIn).getTime()
  const totalMin = Math.floor(diffMs / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

function formatDate(): string {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function BadgeusePage() {
  const [presence, setPresence] = useState<Presence | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    fetchPresence()
    const tick = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(tick)
  }, [])

  async function fetchPresence() {
    const res = await fetch('/api/presences')
    if (res.ok) setPresence(await res.json())
  }

  async function handleClockIn() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/presences/clock-in', { method: 'POST' })
    if (res.ok) setPresence(await res.json())
    else setError('Erreur lors du pointage')
    setLoading(false)
  }

  async function handleClockOut() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/presences/clock-out', { method: 'POST' })
    if (res.ok) setPresence(await res.json())
    else setError('Erreur lors du pointage')
    setLoading(false)
  }

  const isClockedIn = !!presence?.clock_in
  const isClockedOut = !!presence?.clock_out

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <div className="mb-6">
        <Link href="/employee" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />Mon espace
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Badgeuse</h1>
        <p className="text-gray-500 mt-1 text-sm capitalize">{formatDate()}</p>
      </div>

      {/* Horloge */}
      <div className="text-center mb-8">
        <p className="text-5xl font-bold text-gray-900 tabular-nums">
          {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Statut du jour */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Aujourd&apos;hui</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 rounded-lg bg-green-50 border border-green-100">
            <p className="text-xs text-green-600 font-medium mb-1">Arrivée</p>
            <p className="text-xl font-bold text-green-700">
              {presence === undefined ? '…' : formatTime(presence?.clock_in ?? null)}
            </p>
          </div>
          <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-100">
            <p className="text-xs text-orange-600 font-medium mb-1">Départ</p>
            <p className="text-xl font-bold text-orange-700">
              {presence === undefined ? '…' : formatTime(presence?.clock_out ?? null)}
            </p>
          </div>
        </div>

        {isClockedIn && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 pt-1">
            <Clock className="h-4 w-4" />
            <span>
              {isClockedOut
                ? `Durée : ${formatDuration(presence!.clock_in!, presence!.clock_out)}`
                : `En service depuis ${formatDuration(presence!.clock_in!, null)}`}
            </span>
          </div>
        )}
      </div>

      {/* Boutons d'action */}
      {error && <p className="text-sm text-red-600 text-center mb-4">{error}</p>}

      {presence === undefined ? null : !isClockedIn ? (
        <Button
          onClick={handleClockIn}
          disabled={loading}
          className="w-full h-14 text-base gap-2 bg-green-600 hover:bg-green-700"
        >
          <LogIn className="h-5 w-5" />
          {loading ? 'Pointage…' : 'Pointer mon arrivée'}
        </Button>
      ) : !isClockedOut ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-center text-sm text-green-700 font-medium">
            ✓ Arrivée pointée à {formatTime(presence!.clock_in)}
          </div>
          <Button
            onClick={handleClockOut}
            disabled={loading}
            variant="outline"
            className="w-full h-14 text-base gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <LogOut className="h-5 w-5" />
            {loading ? 'Pointage…' : 'Pointer mon départ'}
          </Button>
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-4 text-center space-y-1">
          <p className="text-sm font-medium text-gray-700">Journée terminée</p>
          <p className="text-xs text-gray-500">
            {formatTime(presence!.clock_in)} → {formatTime(presence!.clock_out)} · {formatDuration(presence!.clock_in!, presence!.clock_out)}
          </p>
        </div>
      )}
    </div>
  )
}
