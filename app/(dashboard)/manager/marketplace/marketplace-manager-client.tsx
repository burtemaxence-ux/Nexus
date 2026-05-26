'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle,
  User, Calendar, ChevronDown, ChevronUp, Loader2, Trash2,
  UserCheck, Users, Zap, Timer,
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
  const h  = Math.floor(ms / 3600000)
  const m  = Math.floor((ms % 3600000) / 60000)
  if (h === 0) return { label: `${m} min`, urgent: true }
  if (h < 3)   return { label: `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`, urgent: true }
  return { label: `${h}h`, urgent: false }
}

// ── Publish dialog ────────────────────────────────────────────────────────────

type UpcomingShift = {
  id: string
  date: string
  start_time: string
  end_time: string
  position: string | null
  employee_name: string | null
}

function PublishDialog({ onClose, onPublished }: { onClose: () => void; onPublished: () => void }) {
  const [shifts, setShifts]     = useState<UpcomingShift[]>([])
  const [loadingShifts, setLoadingShifts] = useState(true)
  const [selectedShift, setSelectedShift] = useState<string>('')
  const [reason, setReason]     = useState('')
  const [expiresHours, setExpiresHours] = useState(8)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    // Fetch upcoming shifts for next 14 days
    const from = new Date().toISOString().split('T')[0]
    const to   = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
    fetch(`/api/shifts?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(data => {
        // Flatten and sort
        const list = (Array.isArray(data) ? data : [])
          .sort((a: UpcomingShift, b: UpcomingShift) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
        setShifts(list)
      })
      .catch(() => {})
      .finally(() => setLoadingShifts(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedShift) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: selectedShift, reason: reason || undefined, expires_hours: expiresHours }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Erreur')
        return
      }
      onPublished()
    } catch {
      setError('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Publier un shift</h2>
          <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Shift selector */}
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.05em] mb-1.5">
              Shift à pourvoir
            </label>
            {loadingShifts ? (
              <div className="h-10 animate-pulse rounded-lg bg-[var(--border)]" />
            ) : (
              <select
                value={selectedShift}
                onChange={e => setSelectedShift(e.target.value)}
                required
                className="w-full h-10 px-3 text-[13px] border border-[var(--border)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                <option value="">Sélectionner un shift…</option>
                {shifts.map(s => (
                  <option key={s.id} value={s.id}>
                    {fmtDate(s.date)} · {s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)}
                    {s.position ? ` · ${s.position}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.05em] mb-1.5">
              Raison <span className="font-normal text-[var(--text-tertiary)]">(optionnel)</span>
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full h-10 px-3 text-[13px] border border-[var(--border)] rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="">Non précisée</option>
              <option value="Maladie">Maladie</option>
              <option value="Absence non justifiée">Absence non justifiée</option>
              <option value="Renfort demandé">Renfort demandé</option>
              <option value="Shift non couvert">Shift non couvert</option>
            </select>
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.05em] mb-1.5">
              Expire dans
            </label>
            <div className="flex gap-2">
              {[2, 4, 8, 24].map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setExpiresHours(h)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-[13px] font-medium border transition-all duration-150',
                    expiresHours === h
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                  )}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-[var(--border)] text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedShift}
              className="flex-1 h-10 rounded-lg bg-[var(--accent)] text-white text-[13px] font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Publier
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Slot card ─────────────────────────────────────────────────────────────────

function SlotCard({ slot, onRefresh }: { slot: MarketplaceSlot; onRefresh: () => void }) {
  const [expanded, setExpanded]   = useState(slot.status === 'open' && slot.applications.length > 0)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const expiry = fmtExpiry(slot.expiresAt)

  async function handleConfirm(employeeId: string) {
    setConfirming(employeeId)
    setError(null)
    try {
      const res = await fetch(`/api/marketplace/${slot.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erreur'); return }
      onRefresh()
    } catch { setError('Erreur réseau') } finally { setConfirming(null) }
  }

  async function handleCancel() {
    if (!confirm('Annuler ce slot marketplace ?')) return
    setCancelling(true)
    try {
      await fetch(`/api/marketplace/${slot.id}`, { method: 'DELETE' })
      onRefresh()
    } catch {} finally { setCancelling(false) }
  }

  const statusColors = {
    open:      { bg: '#EFF6FF', text: '#2563EB', label: 'Ouvert' },
    filled:    { bg: '#DCFCE7', text: '#16A34A', label: 'Pourvu' },
    expired:   { bg: '#F3F4F6', text: '#6B7280', label: 'Expiré' },
    cancelled: { bg: '#FEF2F2', text: '#DC2626', label: 'Annulé' },
  }
  const sc = statusColors[slot.status]

  return (
    <div className={cn(
      'bg-[var(--bg-card)] border rounded-xl overflow-hidden',
      slot.status === 'open' && slot.applications.length > 0 ? 'border-[#BFDBFE]' : 'border-[var(--border)]'
    )}>
      {/* Header */}
      <div className="px-4 py-3.5 flex items-start gap-3">
        <div className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
          slot.status === 'open' ? 'bg-[#EFF6FF]' : 'bg-[var(--bg-page)]'
        )}>
          {slot.status === 'open'     && <Clock    className="h-4 w-4 text-[#2563EB]" />}
          {slot.status === 'filled'   && <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />}
          {slot.status === 'expired'  && <Timer    className="h-4 w-4 text-[#6B7280]" />}
          {slot.status === 'cancelled'&& <XCircle  className="h-4 w-4 text-[#DC2626]" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">
              {slot.shift.position ?? 'Shift'}
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ color: sc.text, background: sc.bg }}
            >
              {sc.label}
            </span>
            {slot.reason && (
              <span className="text-[11px] text-[var(--text-tertiary)]">· {slot.reason}</span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap text-[12px] text-[var(--text-secondary)]">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {fmtDate(slot.shift.date)}
            </span>
            <span>{fmtTime(slot.shift.startTime, slot.shift.endTime)}</span>
            {slot.shift.employeeName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {slot.status === 'filled' ? slot.filledByName : slot.shift.employeeName}
              </span>
            )}
          </div>

          {slot.status === 'open' && (
            <div className="flex items-center gap-3 mt-1.5">
              <span className={cn(
                'flex items-center gap-1 text-[11px] font-medium',
                expiry.urgent ? 'text-[#D97706]' : 'text-[var(--text-tertiary)]'
              )}>
                <Timer className="h-3 w-3" />
                {expiry.label}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                <Users className="h-3 w-3" />
                {slot.applications.length} candidature{slot.applications.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {slot.status === 'open' && (
            <>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                title="Annuler le slot"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              {slot.applications.length > 0 && (
                <button
                  onClick={() => setExpanded(o => !o)}
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Applications list */}
      {expanded && slot.applications.length > 0 && (
        <div className="border-t border-[var(--border)]">
          <p className="px-4 py-2 text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.06em]">
            Candidatures
          </p>
          {slot.applications.map(app => (
            <div
              key={app.id}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 border-t border-[var(--border)]',
                app.status === 'accepted' && 'bg-[#F0FDF4]',
                app.status === 'rejected' && 'bg-[var(--bg-page)] opacity-60',
              )}
            >
              <div className="w-7 h-7 rounded-full bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-[var(--accent)]">
                  {app.employeeName.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="flex-1 text-[13px] font-medium text-[var(--text-primary)]">
                {app.employeeName}
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)]">
                {new Date(app.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>

              {app.status === 'pending' && slot.status === 'open' && (
                <button
                  onClick={() => handleConfirm(app.employeeId)}
                  disabled={!!confirming}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16A34A] text-white text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {confirming === app.employeeId
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <UserCheck className="h-3.5 w-3.5" />
                  }
                  Confirmer
                </button>
              )}

              {app.status === 'accepted' && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#16A34A]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirmé
                </span>
              )}
              {app.status === 'rejected' && (
                <span className="flex items-center gap-1 text-[11px] text-[#6B7280]">
                  <XCircle className="h-3.5 w-3.5" /> Refusé
                </span>
              )}
            </div>
          ))}
          {error && (
            <p className="px-4 py-2 text-[12px] text-[#DC2626]">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Tab = 'open' | 'history'

export default function MarketplaceManagerClient() {
  const [slots, setSlots]         = useState<MarketplaceSlot[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [showPublish, setShowPublish] = useState(false)
  const [tab, setTab]             = useState<Tab>('open')

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/marketplace')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSlots(data.slots ?? [])
    } catch {
      setError('Impossible de charger la marketplace.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  const openSlots    = slots.filter(s => s.status === 'open')
  const historySlots = slots.filter(s => s.status !== 'open')
  const pendingApps  = openSlots.reduce((n, s) => n + s.applications.filter(a => a.status === 'pending').length, 0)

  return (
    <div className="space-y-4">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
          <button
            onClick={() => setTab('open')}
            className={cn(
              'flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150',
              tab === 'open'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            En cours
            {openSlots.length > 0 && (
              <span className={cn(
                'inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold',
                tab === 'open' ? 'bg-white/25 text-white' : 'bg-[var(--accent-light)] text-[var(--accent)]'
              )}>
                {openSlots.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('history')}
            className={cn(
              'px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150',
              tab === 'history'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            Historique
          </button>
        </div>

        {/* Pending badge */}
        {pendingApps > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] text-[12px] font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            {pendingApps} candidature{pendingApps > 1 ? 's' : ''} en attente
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={fetchSlots}
            className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setShowPublish(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Publier un shift
          </button>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[13px]">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-3">
          {[0,1,2].map(i => (
            <div key={i} className="animate-pulse h-24 rounded-xl bg-[var(--border)]" />
          ))}
        </div>
      )}

      {/* ── Slots ─────────────────────────────────────────────────────────── */}
      {!loading && (
        <>
          {tab === 'open' && (
            openSlots.length === 0 ? (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-6 py-12 text-center">
                <Zap className="h-8 w-8 text-[var(--text-tertiary)] mx-auto mb-3" />
                <p className="text-[14px] font-medium text-[var(--text-primary)]">Aucun slot ouvert</p>
                <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                  Publiez un shift pour trouver un remplaçant rapidement.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {openSlots.map(slot => (
                  <SlotCard key={slot.id} slot={slot} onRefresh={fetchSlots} />
                ))}
              </div>
            )
          )}

          {tab === 'history' && (
            historySlots.length === 0 ? (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-6 py-12 text-center">
                <p className="text-[13px] text-[var(--text-secondary)]">Aucun historique sur les 30 derniers jours.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historySlots.map(slot => (
                  <SlotCard key={slot.id} slot={slot} onRefresh={fetchSlots} />
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* ── Publish dialog ─────────────────────────────────────────────────── */}
      {showPublish && (
        <PublishDialog
          onClose={() => setShowPublish(false)}
          onPublished={() => { setShowPublish(false); fetchSlots() }}
        />
      )}
    </div>
  )
}
