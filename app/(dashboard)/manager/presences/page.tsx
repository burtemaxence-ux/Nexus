'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogIn, LogOut, Coffee, Users, Clock, Wifi } from 'lucide-react'

type Employee = {
  id: string
  full_name: string | null
  email: string | null
  position: string | null
}

type PresenceRow = {
  id: string
  employee_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  break_start: string | null
  break_end: string | null
  break_minutes_used: number
}

type EmployeeStatus = 'present' | 'on_break' | 'departed' | 'absent'

type EmployeeWithPresence = Employee & {
  presence: PresenceRow | null
  status: EmployeeStatus
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(from: string, to: string | null): string {
  const end = to ? new Date(to) : new Date()
  const m = Math.floor((end.getTime() - new Date(from).getTime()) / 60000)
  const h = Math.floor(m / 60)
  const mm = m % 60
  return h > 0 ? `${h}h${String(mm).padStart(2, '0')}` : `${m} min`
}

function getInitials(name: string | null, email: string | null): string {
  const s = name ?? email ?? '?'
  return s.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function getStatus(p: PresenceRow | null): EmployeeStatus {
  if (!p?.clock_in) return 'absent'
  if (p.clock_out) return 'departed'
  if (p.break_start && !p.break_end) return 'on_break'
  return 'present'
}

const STATUS_CONFIG: Record<EmployeeStatus, { label: string; dot: string; card: string; avatar: string; text: string }> = {
  present:  { label: 'En service',       dot: 'bg-emerald-500',                       card: 'border-emerald-200 bg-emerald-50/40',   avatar: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-700' },
  on_break: { label: 'En pause',         dot: 'bg-amber-400',                         card: 'border-amber-200 bg-amber-50/40',       avatar: 'bg-amber-100 text-amber-700',    text: 'text-amber-700'   },
  departed: { label: 'Ont terminé',      dot: 'bg-gray-400',                          card: 'border-gray-200 bg-gray-50/40',         avatar: 'bg-gray-100 text-gray-500',      text: 'text-gray-500'    },
  absent:   { label: 'Pas encore pointé', dot: 'bg-gray-200 border border-gray-300',  card: 'border-gray-100',                       avatar: 'bg-gray-100 text-gray-400',      text: 'text-gray-400'    },
}

export default function PresencesDashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [presences, setPresences] = useState<PresenceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  const fetchData = useCallback(async () => {
    const [empRes, presRes] = await Promise.all([
      fetch('/api/employees'),
      fetch('/api/presences'),
    ])
    if (empRes.ok) setEmployees(await empRes.json())
    if (presRes.ok) setPresences(await presRes.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()

    const supabase = createClient()
    const channel = supabase
      .channel('presences-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presences' }, fetchData)
      .subscribe()

    const tick = setInterval(() => setNow(new Date()), 30000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(tick)
    }
  }, [fetchData])

  const presenceMap = new Map(presences.map(p => [p.employee_id, p]))

  const merged: EmployeeWithPresence[] = employees.map(e => {
    const presence = presenceMap.get(e.id) ?? null
    return { ...e, presence, status: getStatus(presence) }
  })

  const groups: EmployeeStatus[] = ['present', 'on_break', 'departed', 'absent']
  const counts = {
    present: merged.filter(e => e.status === 'present').length,
    on_break: merged.filter(e => e.status === 'on_break').length,
    departed: merged.filter(e => e.status === 'departed').length,
    absent: merged.filter(e => e.status === 'absent').length,
  }

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Présences</h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
          <Wifi className="h-3 w-3" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Temps réel
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {([
          { key: 'present',  icon: LogIn,   label: 'En service',  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          { key: 'on_break', icon: Coffee,  label: 'En pause',    color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
          { key: 'departed', icon: LogOut,  label: 'Partis',      color: 'text-gray-600',    bg: 'bg-gray-50 border-gray-200' },
          { key: 'absent',   icon: Users,   label: 'Attendus',    color: 'text-gray-400',    bg: 'bg-white border-gray-100' },
        ] as const).map(({ key, icon: Icon, label, color, bg }) => (
          <div key={key} className={`rounded-xl border p-4 text-center ${bg}`}>
            <Icon className={`h-4 w-4 mx-auto mb-2 ${color}`} />
            <p className={`text-2xl font-bold ${color}`}>{counts[key]}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : employees.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Aucun employé</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Ajoutez des employés pour voir leurs pointages ici</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(status => {
            const group = merged.filter(e => e.status === status)
            if (group.length === 0) return null
            const cfg = STATUS_CONFIG[status]
            return (
              <div key={status}>
                <h2 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                  <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                  {cfg.label} · {group.length}
                </h2>
                <div className="space-y-2">
                  {group.map(emp => (
                    <EmployeeCard key={emp.id} emp={emp} now={now} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmployeeCard({ emp, now }: { emp: EmployeeWithPresence; now: Date }) {
  const p = emp.presence
  const cfg = STATUS_CONFIG[emp.status]
  void now // trigger re-render for live duration

  return (
    <div className={`rounded-xl border bg-card px-4 py-3 flex items-center gap-3 transition-colors ${cfg.card}`}>
      {/* Avatar */}
      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${cfg.avatar}`}>
        {getInitials(emp.full_name, emp.email)}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{emp.full_name ?? emp.email}</p>
        {emp.position && <p className="text-xs text-muted-foreground">{emp.position}</p>}
      </div>

      {/* Horaires */}
      <div className="text-right flex-shrink-0 space-y-0.5">
        {!p?.clock_in ? (
          <p className="text-xs text-muted-foreground/50">—</p>
        ) : (
          <>
            <div className="flex items-center justify-end gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <LogIn className="h-3 w-3" />{formatTime(p.clock_in)}
              </span>
              {p.clock_out && (
                <span className="flex items-center gap-1 text-gray-500 font-medium">
                  <LogOut className="h-3 w-3" />{formatTime(p.clock_out)}
                </span>
              )}
            </div>
            {p.break_start && (
              <p className="text-[10px] text-amber-500">
                ☕ {formatTime(p.break_start)}{p.break_end ? ` → ${formatTime(p.break_end)}` : ' (en pause)'}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
              <Clock className="h-2.5 w-2.5" />
              {formatDuration(p.clock_in!, p.clock_out)}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
