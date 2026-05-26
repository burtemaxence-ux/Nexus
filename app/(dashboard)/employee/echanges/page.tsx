'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ArrowLeftRight, Clock, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react'

type ExchangeStatus = 'open' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled'

type Exchange = {
  id: string
  shift_id: string
  proposer_id: string
  acceptor_id: string | null
  status: ExchangeStatus
  proposer_note: string | null
  manager_note: string | null
  created_at: string
  shift: { date: string; start_time: string; end_time: string; position: string | null; break_minutes: number } | null
  proposer: { full_name: string | null; email: string | null } | null
  acceptor: { full_name: string | null; email: string | null } | null
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
function fmtTime(t: string) { return t.slice(0, 5) }

function StatusBadge({ status }: { status: ExchangeStatus }) {
  if (status === 'open')             return <span className="dp-badge-warning inline-flex items-center gap-1"><Clock className="h-3 w-3" />En attente</span>
  if (status === 'pending_approval') return <span className="dp-badge-warning inline-flex items-center gap-1"><Clock className="h-3 w-3" />Validation manager</span>
  if (status === 'approved')         return <span className="dp-badge-success inline-flex items-center gap-1"><CheckCircle className="h-3 w-3" />Approuvé</span>
  if (status === 'rejected')         return <span className="dp-badge-danger inline-flex items-center gap-1"><XCircle className="h-3 w-3" />Refusé</span>
  return <span className="dp-badge inline-flex items-center gap-1"><XCircle className="h-3 w-3" />Annulé</span>
}

type Tab = 'mine' | 'available'

export default function EchangesPage() {
  const [tab, setTab] = useState<Tab>('mine')
  const [mine, setMine] = useState<Exchange[]>([])
  const [available, setAvailable] = useState<Exchange[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [mineRes, availRes] = await Promise.all([
      fetch('/api/exchanges?view=mine'),
      fetch('/api/exchanges?view=available'),
    ])
    if (mineRes.ok)  setMine(await mineRes.json())
    if (availRes.ok) setAvailable(await availRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function cancelOffer(id: string) {
    setBusy(id)
    await fetch(`/api/exchanges/${id}`, { method: 'DELETE' })
    setBusy(null)
    fetchAll()
  }

  async function acceptOffer(id: string) {
    setBusy(id)
    const res = await fetch(`/api/exchanges/${id}/accept`, { method: 'POST' })
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string }
      alert(d.error ?? 'Erreur')
    }
    setBusy(null)
    fetchAll()
  }

  const myOffers    = mine.filter(e => e.status === 'open' || e.status === 'pending_approval')
  const myHistory   = mine.filter(e => e.status === 'approved' || e.status === 'rejected' || e.status === 'cancelled')

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Link href="/employee" className="inline-flex items-center gap-1 text-[13px] transition-colors duration-150" style={{ color: 'var(--text-secondary)' }}>
          <ChevronLeft className="h-4 w-4" /> Mon espace
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>Échanges de shifts</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Proposez vos shifts ou reprenez ceux de vos collègues
        </p>
      </div>

      {/* Tabs */}
      <div className="flex mb-6 overflow-hidden" style={{ border: '0.5px solid var(--border)', borderRadius: '8px', width: 'fit-content' }}>
        {([['mine', 'Mes offres'], ['available', 'Disponibles']] as [Tab, string][]).map(([t, label], i) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-[13px] font-medium transition-colors duration-150"
            style={{
              backgroundColor: tab === t ? 'var(--text-primary)' : 'transparent',
              color: tab === t ? 'var(--bg-card)' : 'var(--text-tertiary)',
              borderLeft: i > 0 ? '0.5px solid var(--border)' : undefined,
            }}
          >
            {label}
            {t === 'available' && available.length > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
                {available.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      ) : tab === 'mine' ? (
        <>
          {/* Active offers */}
          {myOffers.length === 0 && myHistory.length === 0 ? (
            <EmptyState
              icon={<ArrowLeftRight className="h-8 w-8" />}
              title="Aucune offre"
              subtitle={'Sur votre planning, cliquez sur « Proposer » sur un shift futur pour l\'offrir à l\'échange.'}
            />
          ) : (
            <>
              {myOffers.length > 0 && (
                <div className="space-y-2 mb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: 'var(--text-tertiary)' }}>En cours</p>
                  {myOffers.map(ex => (
                    <ExchangeCard key={ex.id} exchange={ex} mode="mine" busy={busy === ex.id}
                      onCancel={() => cancelOffer(ex.id)} />
                  ))}
                </div>
              )}
              {myHistory.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: 'var(--text-tertiary)' }}>Historique</p>
                  {myHistory.map(ex => (
                    <ExchangeCard key={ex.id} exchange={ex} mode="history" busy={false} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        /* Available exchanges from colleagues */
        available.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight className="h-8 w-8" />}
            title="Aucun shift disponible"
            subtitle="Vos collègues n'ont pas proposé de shift pour l'instant."
          />
        ) : (
          <div className="space-y-2">
            {available.map(ex => (
              <ExchangeCard key={ex.id} exchange={ex} mode="available" busy={busy === ex.id}
                onAccept={() => acceptOffer(ex.id)} />
            ))}
          </div>
        )
      )}
    </div>
  )
}

function ExchangeCard({ exchange, mode, busy, onCancel, onAccept }: {
  exchange: Exchange
  mode: 'mine' | 'history' | 'available'
  busy: boolean
  onCancel?: () => void
  onAccept?: () => void
}) {
  const shift = exchange.shift
  if (!shift) return null
  return (
    <div className="rounded-xl p-4 flex items-start justify-between gap-4" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <StatusBadge status={exchange.status} />
          {mode === 'available' && exchange.proposer && (
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              proposé par {exchange.proposer.full_name ?? exchange.proposer.email}
            </span>
          )}
        </div>
        <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {fmtDate(shift.date)}
        </p>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {fmtTime(shift.start_time)} – {fmtTime(shift.end_time)}
          {shift.break_minutes > 0 && <span className="ml-2 text-[11px]">(pause {shift.break_minutes}min)</span>}
          {shift.position && <span className="ml-2 font-medium">{shift.position}</span>}
        </p>
        {exchange.proposer_note && (
          <p className="text-[12px] mt-1 italic" style={{ color: 'var(--text-secondary)' }}>
            &quot;{exchange.proposer_note}&quot;
          </p>
        )}
        {exchange.status === 'pending_approval' && exchange.acceptor && (
          <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Accepté par {exchange.acceptor.full_name ?? exchange.acceptor.email} — en attente du manager
          </p>
        )}
        {exchange.manager_note && (
          <p className="text-[12px] mt-1 italic" style={{ color: 'var(--text-secondary)' }}>
            Manager : &quot;{exchange.manager_note}&quot;
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        {mode === 'mine' && exchange.status === 'open' && onCancel && (
          <button onClick={onCancel} disabled={busy} className="p-1.5 rounded-lg transition-colors disabled:opacity-50" style={{ color: 'var(--danger)' }} title="Annuler l'offre">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        )}
        {mode === 'available' && onAccept && (
          <button
            onClick={onAccept}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowLeftRight className="h-3.5 w-3.5" />}
            Prendre ce shift
          </button>
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3" style={{ color: 'var(--text-tertiary)' }}>{icon}</div>
      <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      <p className="text-[12px] max-w-xs" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</p>
    </div>
  )
}
