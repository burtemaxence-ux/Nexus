'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeftRight, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react'

type Exchange = {
  id: string
  status: string
  proposer_note: string | null
  manager_note: string | null
  created_at: string
  shift: { date: string; start_time: string; end_time: string; position: string | null } | null
  proposer: { full_name: string | null; email: string | null } | null
  acceptor: { full_name: string | null; email: string | null } | null
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
function fmtTime(t: string) { return t.slice(0, 5) }
function empName(p: { full_name: string | null; email: string | null } | null) {
  return p?.full_name ?? p?.email ?? '—'
}

export default function ManagerEchangesPage() {
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [noteMap, setNoteMap] = useState<Record<string, string>>({})

  const fetchExchanges = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/exchanges?view=pending')
    if (res.ok) setExchanges(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchExchanges() }, [fetchExchanges])

  async function decide(id: string, action: 'approve' | 'reject') {
    setBusy(id)
    await fetch(`/api/exchanges/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: noteMap[id] ?? '' }),
    })
    setBusy(null)
    fetchExchanges()
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-11 z-10">
        <div className="px-6 max-w-4xl mx-auto h-14 flex items-center gap-3">
          <ArrowLeftRight className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
            Échanges de shifts
          </h1>
          {exchanges.length > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
              {exchanges.length}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-secondary)' }} />
          </div>
        ) : exchanges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ArrowLeftRight className="h-8 w-8 mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Aucun échange en attente</p>
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Les demandes d&apos;échange apparaîtront ici dès qu&apos;un employé accepte l&apos;offre d&apos;un collègue.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {exchanges.map(ex => {
              const shift = ex.shift
              if (!shift) return null
              return (
                <div key={ex.id} className="rounded-xl p-5" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
                  {/* Status */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="dp-badge-warning inline-flex items-center gap-1 text-[11px]">
                      <Clock className="h-3 w-3" /> En attente de validation
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(ex.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>

                  {/* Shift info */}
                  <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-page)', border: '0.5px solid var(--border)' }}>
                    <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {fmtDate(shift.date)}
                    </p>
                    <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                      {fmtTime(shift.start_time)} – {fmtTime(shift.end_time)}
                      {shift.position && <span className="ml-2 font-medium">{shift.position}</span>}
                    </p>
                  </div>

                  {/* Parties */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-lg text-center" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-1" style={{ color: 'var(--text-tertiary)' }}>Propose</p>
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{empName(ex.proposer)}</p>
                    </div>
                    <div className="p-3 rounded-lg text-center" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-1" style={{ color: 'var(--text-tertiary)' }}>Reprend</p>
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{empName(ex.acceptor)}</p>
                    </div>
                  </div>

                  {ex.proposer_note && (
                    <p className="text-[12px] mb-4 italic" style={{ color: 'var(--text-secondary)' }}>
                      Note : &quot;{ex.proposer_note}&quot;
                    </p>
                  )}

                  {/* Manager note */}
                  <div className="mb-4">
                    <input
                      type="text"
                      value={noteMap[ex.id] ?? ''}
                      onChange={e => setNoteMap(prev => ({ ...prev, [ex.id]: e.target.value }))}
                      placeholder="Note au manager (optionnel)"
                      className="w-full text-[13px] rounded-lg px-3 py-2 bg-transparent focus:outline-none"
                      style={{ border: '0.5px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => decide(ex.id, 'approve')}
                      disabled={busy === ex.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: 'var(--success)', color: 'white' }}
                    >
                      {busy === ex.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Approuver l&apos;échange
                    </button>
                    <button
                      onClick={() => decide(ex.id, 'reject')}
                      disabled={busy === ex.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-opacity disabled:opacity-50"
                      style={{ border: '0.5px solid var(--danger)', color: 'var(--danger)' }}
                    >
                      {busy === ex.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Refuser
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
