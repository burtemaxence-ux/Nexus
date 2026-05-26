'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Zap, Calendar, Clock, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Loader2, Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MarketplaceSlot } from '@/app/api/marketplace/route'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function fmtTime(s: string, e: string) {
  return `${s.slice(0, 5)} – ${e.slice(0, 5)}`
}

function fmtExpiry(expiresAt: string): { label: string; urgent: boolean } {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return { label: 'Expiré', urgent: true }
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h === 0) return { label: `${m} min`, urgent: true }
  if (h < 3)   return { label: `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`, urgent: true }
  return { label: `${h}h`, urgent: false }
}

function shiftDurationH(startTime: string, endTime: string, breakMin: number): string {
  let s = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1])
  let e = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1])
  if (e <= s) e += 1440
  const net = Math.max(0, e - s - breakMin)
  const h = Math.floor(net / 60)
  const m = net % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

// ── Slot card ─────────────────────────────────────────────────────────────────

function SlotCard({ slot, onRefresh }: { slot: MarketplaceSlot; onRefresh: () => void }) {
  const [applying, setApplying]   = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const expiry    = fmtExpiry(slot.expiresAt)
  const myApp     = slot.myApplication
  const isExpired = new Date(slot.expiresAt) < new Date()

  async function handleApply() {
    setApplying(true)
    setError(null)
    try {
      const res = await fetch(`/api/marketplace/${slot.id}/apply`, { method: 'POST' })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erreur'); return }
      onRefresh()
    } catch { setError('Erreur réseau') } finally { setApplying(false) }
  }

  const appColors = {
    pending:  { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', label: 'En attente' },
    accepted: { bg: '#DCFCE7', border: '#86EFAC', text: '#16A34A', label: 'Accepté ✓' },
    rejected: { bg: '#F3F4F6', border: '#E5E7EB', text: '#6B7280', label: 'Non retenu' },
  }

  return (
    <div className={cn(
      'bg-[var(--bg-card)] border rounded-xl overflow-hidden',
      myApp?.status === 'accepted' ? 'border-[#86EFAC]' : 'border-[var(--border)]'
    )}>
      <div className="p-4">
        {/* Position + date */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-[var(--text-primary)]">
              {slot.shift.position ?? 'Shift disponible'}
            </p>
            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
              {fmtDate(slot.shift.date)}
            </p>
          </div>
          {myApp && (
            <span
              className="flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{
                color: appColors[myApp.status].text,
                background: appColors[myApp.status].bg,
                border: `1px solid ${appColors[myApp.status].border}`,
              }}
            >
              {appColors[myApp.status].label}
            </span>
          )}
        </div>

        {/* Time + duration */}
        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
          <span className="flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)]">
            <Clock className="h-3.5 w-3.5" />
            {fmtTime(slot.shift.startTime, slot.shift.endTime)}
          </span>
          <span className="text-[13px] text-[var(--text-secondary)]">
            {shiftDurationH(slot.shift.startTime, slot.shift.endTime, slot.shift.breakMinutes)} net
          </span>
          {slot.reason && (
            <span className="text-[12px] text-[var(--text-tertiary)]">· {slot.reason}</span>
          )}
        </div>

        {/* Expiry */}
        <div className="flex items-center gap-2 mt-2">
          <span className={cn(
            'flex items-center gap-1 text-[11px] font-medium',
            expiry.urgent ? 'text-[#D97706]' : 'text-[var(--text-tertiary)]'
          )}>
            <Timer className="h-3 w-3" />
            Expire dans {expiry.label}
          </span>
        </div>

        {/* Error */}
        {error && (
          <p className="mt-2 text-[12px] text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-1.5">
            {error}
          </p>
        )}

        {/* CTA */}
        {!myApp && !isExpired && (
          <button
            onClick={handleApply}
            disabled={applying}
            className="mt-3 w-full h-10 rounded-xl bg-[var(--accent)] text-white text-[13px] font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {applying
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Zap className="h-4 w-4" />
            }
            Je suis disponible
          </button>
        )}

        {myApp?.status === 'accepted' && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#DCFCE7] text-[#16A34A] text-[13px] font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Shift confirmé — rendez-vous le {fmtDate(slot.shift.date)} !
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'available' | 'mine'

export default function EmployeeMarketplacePage() {
  const [slots, setSlots]     = useState<MarketplaceSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tab, setTab]         = useState<Tab>('available')

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/marketplace')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSlots(data.slots ?? [])
    } catch { setError('Impossible de charger la marketplace.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  const available = slots.filter(s => s.status === 'open' && !s.myApplication)
  const myApps    = slots.filter(s => !!s.myApplication)

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-[-0.02em]">
          Shifts disponibles
        </h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
          Shifts ouverts pour lesquels vous êtes disponible.
        </p>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 p-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
          <button
            onClick={() => setTab('available')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-medium transition-all',
              tab === 'available'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Disponibles
            {available.length > 0 && (
              <span className={cn(
                'inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold',
                tab === 'available' ? 'bg-white/25 text-white' : 'bg-[var(--accent-light)] text-[var(--accent)]'
              )}>
                {available.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('mine')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-medium transition-all',
              tab === 'mine'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Mes candidatures
            {myApps.length > 0 && (
              <span className={cn(
                'inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold',
                tab === 'mine' ? 'bg-white/25 text-white' : 'bg-[var(--accent-light)] text-[var(--accent)]'
              )}>
                {myApps.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 pb-6 space-y-3">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[13px]">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
            <button onClick={fetchSlots} className="ml-auto">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && [0,1,2].map(i => (
          <div key={i} className="animate-pulse h-36 rounded-xl bg-[var(--border)]" />
        ))}

        {/* Content */}
        {!loading && tab === 'available' && (
          available.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-6 py-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-[var(--text-tertiary)] mx-auto mb-3" />
              <p className="text-[14px] font-medium text-[var(--text-primary)]">Aucun shift disponible</p>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                Vous serez notifié dès qu'un shift est ouvert.
              </p>
            </div>
          ) : (
            available.map(slot => <SlotCard key={slot.id} slot={slot} onRefresh={fetchSlots} />)
          )
        )}

        {!loading && tab === 'mine' && (
          myApps.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-6 py-12 text-center">
              <p className="text-[13px] text-[var(--text-secondary)]">Vous n'avez pas encore postulé.</p>
            </div>
          ) : (
            myApps.map(slot => <SlotCard key={slot.id} slot={slot} onRefresh={fetchSlots} />)
          )
        )}
      </div>
    </div>
  )
}
