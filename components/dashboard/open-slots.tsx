'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Megaphone, ArrowRight } from 'lucide-react'

interface Shift { date: string; start_time: string | null; end_time: string | null; position: string | null }
interface SlotRow { id: string; expires_at: string | null; shifts: Shift | Shift[] | null }

function shiftOf(s: SlotRow): Shift | null {
  return Array.isArray(s.shifts) ? (s.shifts[0] ?? null) : s.shifts
}
function fmtDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

/**
 * Cockpit — Postes à pourvoir. Shifts publiés au marketplace encore "open"
 * (sans preneur). Masqué quand il n'y a rien à pourvoir (widget contextuel).
 */
export function OpenSlots() {
  const [slots, setSlots] = useState<SlotRow[] | null>(null)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase
      .from('marketplace_slots')
      .select('id, expires_at, shifts(date, start_time, end_time, position)')
      .eq('status', 'open')
      .limit(50)
      .then(({ data }) => { if (active) setSlots((data ?? []) as SlotRow[]) })
    return () => { active = false }
  }, [])

  if (slots === null || slots.length === 0) return null

  // Tri par date du shift (le plus proche d'abord)
  const sorted = slots
    .map(s => ({ s, shift: shiftOf(s) }))
    .filter(x => x.shift)
    .sort((a, b) => (a.shift!.date).localeCompare(b.shift!.date))
  const visible = sorted.slice(0, 5)

  return (
    <div className="rounded-[14px] border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,179,71,0.12)' }}>
          <Megaphone className="h-5 w-5" style={{ color: 'var(--warning)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
            Postes à pourvoir
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {slots.length} shift{slots.length > 1 ? 's' : ''} publié{slots.length > 1 ? 's' : ''} sans preneur
          </p>
        </div>
        <Link href="/manager/marketplace" className="flex items-center gap-1 text-[12px] font-medium flex-shrink-0" style={{ color: 'var(--accent)' }}>
          Marketplace <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="px-3 py-2">
        {visible.map(({ s, shift }) => (
          <Link key={s.id} href="/manager/marketplace" className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--warning)' }} />
            <span className="text-[13px] font-medium capitalize flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
              {fmtDate(shift!.date)}
            </span>
            <span className="text-[12px] truncate flex-1 min-w-0" style={{ color: 'var(--text-tertiary)' }}>
              {[shift!.position, shift!.start_time && shift!.end_time ? `${shift!.start_time.slice(0, 5)}–${shift!.end_time.slice(0, 5)}` : null].filter(Boolean).join(' · ')}
            </span>
          </Link>
        ))}
        {sorted.length > 5 && (
          <Link href="/manager/marketplace" className="block text-center text-[12px] py-2 mt-0.5" style={{ color: 'var(--accent)' }}>
            + {sorted.length - 5} autre{sorted.length - 5 > 1 ? 's' : ''}
          </Link>
        )}
      </div>
    </div>
  )
}
