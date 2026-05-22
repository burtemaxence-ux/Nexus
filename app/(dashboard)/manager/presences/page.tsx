'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Users, LogIn, LogOut, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type PresenceRow = {
  id: string
  employee_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  break_start: string | null
  break_end: string | null
  profiles: {
    id: string
    full_name: string | null
    email: string | null
    position: string | null
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(clockIn: string, clockOut: string | null): string {
  const end = clockOut ? new Date(clockOut) : new Date()
  const totalMin = Math.floor((end.getTime() - new Date(clockIn).getTime()) / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`
}

function getInitials(name: string | null, email: string | null): string {
  const s = name ?? email ?? '?'
  return s.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function StatusDot({ color }: { color: 'green' | 'orange' | 'gray' }) {
  const cls = color === 'green' ? 'bg-green-500' : color === 'orange' ? 'bg-orange-400' : 'bg-gray-300'
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls} flex-shrink-0`} />
}

export default function PresencesDashboardPage() {
  const [presences, setPresences] = useState<PresenceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  const fetchPresences = useCallback(async () => {
    const res = await fetch('/api/presences')
    if (res.ok) setPresences(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPresences()

    // Supabase Realtime — écoute les INSERT et UPDATE sur la table presences
    const supabase = createClient()
    const channel = supabase
      .channel('presences-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presences' },
        () => fetchPresences()
      )
      .subscribe()

    // Horloge pour rafraîchir les durées affichées
    const tick = setInterval(() => setNow(new Date()), 60000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(tick)
    }
  }, [fetchPresences])

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const present = presences.filter(p => p.clock_in && !p.clock_out)
  const departed = presences.filter(p => p.clock_in && p.clock_out)
  const absent = presences.filter(p => !p.clock_in)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/manager" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />Tableau de bord
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Présences</h1>
          <p className="text-gray-500 mt-1 text-sm capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Temps réel
        </div>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <StatusDot color="green" />
            <span className="text-xs font-medium text-gray-500">Présents</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{present.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <StatusDot color="orange" />
            <span className="text-xs font-medium text-gray-500">Partis</span>
          </div>
          <p className="text-3xl font-bold text-orange-500">{departed.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <StatusDot color="gray" />
            <span className="text-xs font-medium text-gray-500">Pas encore</span>
          </div>
          <p className="text-3xl font-bold text-gray-400">{absent.length}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Chargement…</p>
      ) : presences.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun pointage aujourd&apos;hui</p>
          <p className="text-sm text-gray-400 mt-1">Les pointages apparaîtront ici en temps réel</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Présents */}
          {present.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <StatusDot color="green" /> En service
              </h2>
              <div className="space-y-2">
                {present.map(p => (
                  <PresenceCard key={p.id} presence={p} now={now} />
                ))}
              </div>
            </div>
          )}

          {/* Partis */}
          {departed.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <StatusDot color="orange" /> Ont terminé
              </h2>
              <div className="space-y-2">
                {departed.map(p => (
                  <PresenceCard key={p.id} presence={p} now={now} />
                ))}
              </div>
            </div>
          )}

          {/* Pas encore badgé */}
          {absent.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <StatusDot color="gray" /> Pas encore pointé
              </h2>
              <div className="space-y-2">
                {absent.map(p => (
                  <PresenceCard key={p.id} presence={p} now={now} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PresenceCard({ presence: p, now }: { presence: PresenceRow; now: Date }) {
  const isClockedIn = !!p.clock_in && !p.clock_out
  const isClockedOut = !!p.clock_in && !!p.clock_out
  const emp = p.profiles

  return (
    <div className={`bg-white rounded-lg border px-4 py-3 flex items-center gap-4 ${
      isClockedIn ? 'border-green-200 bg-green-50/30' : isClockedOut ? 'border-orange-100' : 'border-gray-100'
    }`}>
      {/* Avatar */}
      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
        isClockedIn ? 'bg-green-100 text-green-700' : isClockedOut ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
      }`}>
        {getInitials(emp.full_name, emp.email)}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{emp.full_name ?? emp.email}</p>
        {emp.position && <p className="text-xs text-gray-400">{emp.position}</p>}
      </div>

      {/* Horaires */}
      <div className="text-right flex-shrink-0">
        {!p.clock_in ? (
          <p className="text-xs text-gray-400">—</p>
        ) : (
          <>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-green-600">
                <LogIn className="h-3 w-3" />{formatTime(p.clock_in)}
              </span>
              {p.clock_out && (
                <span className="flex items-center gap-1 text-orange-500">
                  <LogOut className="h-3 w-3" />{formatTime(p.clock_out)}
                </span>
              )}
            </div>
            {p.break_start && (
              <p className="text-[10px] text-amber-500 mt-0.5">
                ☕ {formatTime(p.break_start)}{p.break_end ? ` → ${formatTime(p.break_end)}` : ' (en pause)'}
              </p>
            )}
            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center justify-end gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(p.clock_in, p.clock_out)}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
