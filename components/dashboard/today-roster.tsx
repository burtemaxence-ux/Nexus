'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/planning-utils'
import { ArrowRight, CalendarClock } from 'lucide-react'

interface ShiftRow {
  id: string
  employee_id: string
  start_time: string | null
  end_time: string | null
  position: string | null
  profiles: { full_name: string | null } | { full_name: string | null }[] | null
}
interface PresenceRow {
  employee_id: string
  clock_in: string | null
  clock_out: string | null
}

type Status = 'active' | 'done' | 'missing' | 'upcoming'

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  active:   { label: 'En poste',   color: 'var(--success)',        bg: 'rgba(0,212,170,0.12)' },
  done:     { label: 'Terminé',    color: 'var(--text-tertiary)',  bg: 'var(--border)' },
  missing:  { label: 'Pas pointé', color: 'var(--danger)',         bg: 'rgba(255,107,107,0.12)' },
  upcoming: { label: 'À venir',    color: 'var(--accent)',         bg: 'var(--accent-light)' },
}

function nowHM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function empName(s: ShiftRow): string {
  const pr = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
  return pr?.full_name ?? 'Employé'
}

/**
 * Cockpit — Service du jour. La question n°1 du matin d'un manager : qui
 * travaille aujourd'hui, et qui a pointé. Croise shifts du jour + pointages.
 */
export function TodayRoster() {
  const [data, setData] = useState<{ shifts: ShiftRow[]; presences: PresenceRow[] } | null>(null)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    function load() {
      const today = new Date().toISOString().split('T')[0]
      Promise.all([
        supabase
          .from('shifts')
          .select('id, employee_id, start_time, end_time, position, profiles:employee_id(full_name)')
          .eq('date', today)
          .is('deleted_at', null)
          .order('start_time'),
        supabase
          .from('presences')
          .select('employee_id, clock_in, clock_out')
          .eq('date', today),
      ]).then(([s, p]) => {
        if (!active) return
        setData({ shifts: (s.data ?? []) as ShiftRow[], presences: (p.data ?? []) as PresenceRow[] })
      })
    }
    load()
    // Cockpit live : rafraîchit les pointages au fil du service.
    const id = setInterval(load, 60_000)
    return () => { active = false; clearInterval(id) }
  }, [])

  if (data === null) {
    return (
      <div className="rounded-[14px] border h-[180px] animate-pulse" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }} />
    )
  }

  const { shifts, presences } = data
  const presByEmp = new Map<string, PresenceRow>()
  for (const p of presences) presByEmp.set(p.employee_id, p)
  const now = nowHM()

  function statusFor(s: ShiftRow): Status {
    const p = presByEmp.get(s.employee_id)
    if (p?.clock_in && p?.clock_out) return 'done'
    if (p?.clock_in) return 'active'
    if (s.start_time && s.start_time.slice(0, 5) <= now) return 'missing'
    return 'upcoming'
  }

  const rows = shifts.map(s => ({ s, status: statusFor(s) }))
  const here = rows.filter(r => r.status === 'active' || r.status === 'done').length
  const visible = rows.slice(0, 6)

  return (
    <div className="rounded-[14px] border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
          <CalendarClock className="h-5 w-5" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-manrope)' }}>
            Service du jour
            {shifts.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full dot-pulse-green" style={{ backgroundColor: 'var(--success)' }} title="En direct" />
            )}
          </p>
          {shifts.length === 0 ? (
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Aucun service planifié</p>
          ) : (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="h-[5px] rounded-full overflow-hidden" style={{ width: 62, background: 'var(--border)' }}>
                <span className="block h-full rounded-full bar-grow-right" style={{ width: `${Math.round((here / shifts.length) * 100)}%`, background: 'var(--success)' }} />
              </span>
              <p className="text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>{here}/{shifts.length} présent{here !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
        <Link href="/manager/presences" className="flex items-center gap-1 text-[12px] font-medium flex-shrink-0" style={{ color: 'var(--accent)' }}>
          Pointages <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {shifts.length === 0 ? (
        <p className="text-[13px] text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
          Aucun service planifié aujourd&apos;hui.
        </p>
      ) : (
        <div className="px-3 py-2">
          {visible.map(({ s, status }) => {
            const meta = STATUS_META[status]
            return (
              <div key={s.id} className="flex items-center gap-3 px-2 py-2 rounded-lg">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
                  <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{getInitials(empName(s))}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{empName(s)}</p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {[s.position, s.start_time && s.end_time ? `${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)}` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold flex-shrink-0" style={{ color: meta.color, backgroundColor: meta.bg }}>
                  {status === 'active' && <span className="w-1.5 h-1.5 rounded-full dot-pulse-green" style={{ backgroundColor: 'var(--success)' }} />}
                  {meta.label}
                </span>
              </div>
            )
          })}
          {rows.length > 6 && (
            <Link href="/manager/planning" className="block text-center text-[12px] py-2 mt-0.5" style={{ color: 'var(--accent)' }}>
              + {rows.length - 6} autre{rows.length - 6 > 1 ? 's' : ''} au planning
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
