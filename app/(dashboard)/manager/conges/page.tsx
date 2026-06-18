'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import type { LeaveRequestWithEmployee } from '@/types'

const LEAVE_LABELS: Record<string, string> = {
  CP: 'Congés payés', RTT: 'RTT', maladie: 'Arrêt maladie', sans_solde: 'Sans solde', autre: 'Autre',
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function countDays(start: string, end: string) {
  return Math.round((new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 86400000) + 1
}

function getInitials(name: string | null, email: string | null): string {
  const s = name ?? email ?? '?'
  return s.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

export default function ManagerCongesPage() {
  const router = useRouter()
  const [listRef] = useAutoAnimate()
  const [requests, setRequests] = useState<LeaveRequestWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [actionId, setActionId] = useState<string | null>(null)
  const [managerComment, setManagerComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState(false)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setFetchError(false)
    try {
      const res = await fetch('/api/conges')
      if (res.ok) setRequests(await res.json())
      else setFetchError(true)
    } catch {
      setFetchError(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  async function handleAction(id: string, status: 'approved' | 'rejected') {
    setActionLoading(true)
    setActionError(null)
    const res = await fetch(`/api/conges/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, manager_comment: managerComment }),
    })
    if (!res.ok) {
      const d = await res.json()
      setActionError(d.error ?? 'Erreur inconnue')
    } else {
      setActionId(null)
      setManagerComment('')
      fetchRequests()
      router.refresh() // rafraîchit le badge congés de la sidebar (layout serveur)
    }
    setActionLoading(false)
  }

  const filtered = requests.filter(r => r.status === filter)
  const pendingCount = requests.filter(r => r.status === 'pending').length

  const FILTERS = [
    { key: 'pending' as const,  label: 'En attente', icon: Clock },
    { key: 'approved' as const, label: 'Validés',    icon: CheckCircle },
    { key: 'rejected' as const, label: 'Refusés',    icon: XCircle },
  ]

  return (
    <div className="px-4 py-4 md:px-6 md:py-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
          Demandes de congés
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Validez ou refusez les demandes de votre équipe
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex overflow-hidden w-full md:w-fit mb-6" style={{ border: '0.5px solid var(--border)', borderRadius: '8px' }}>
        {FILTERS.map(({ key, label, icon: Icon }) => {
          const active = filter === key
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="flex flex-1 md:flex-none items-center justify-center gap-1.5 px-3 md:px-4 py-1.5 text-[13px] transition-colors duration-150"
              style={{
                backgroundColor: active ? 'var(--text-primary)' : 'transparent',
                color: active ? 'var(--bg-card)' : 'var(--text-tertiary)',
                borderLeft: key !== 'pending' ? '0.5px solid var(--border)' : undefined,
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {key === 'pending' && pendingCount > 0 && (
                <span className="dp-badge-warning ml-0.5">{pendingCount}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-5 w-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : fetchError ? (
        <div className="text-center py-16 rounded-xl" style={{ border: '0.5px dashed var(--border)' }}>
          <p className="text-[14px] font-medium" style={{ color: 'var(--danger)' }}>
            Impossible de charger les demandes
          </p>
          <button onClick={fetchRequests} className="mt-3 text-[13px]" style={{ color: 'var(--accent)' }}>
            Réessayer
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ border: '0.5px dashed var(--border)' }}>
          <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Aucune demande {filter === 'pending' ? 'en attente' : filter === 'approved' ? 'validée' : 'refusée'}
          </p>
        </div>
      ) : (
        <div ref={listRef} className="space-y-2">
          {filtered.map(req => {
            const emp = req.profiles as { id: string; full_name: string | null; email: string | null; position: string | null } | null
            if (!emp) return null
            const isOpen = actionId === req.id
            return (
              <div key={req.id} className="overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '12px' }}>
                <div className="p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Employee */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
                        style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                        {getInitials(emp.full_name, emp.email)}
                      </div>
                      <span className="font-medium text-[13px]" style={{ color: 'var(--text-primary)' }}>
                        {emp.full_name ?? emp.email}
                      </span>
                      {emp.position && (
                        <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{emp.position}</span>
                      )}
                    </div>
                    {/* Dates */}
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatDate(req.start_date)}
                      {req.start_date !== req.end_date && <> → {formatDate(req.end_date)}</>}
                      <span className="ml-2 font-normal text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                        ({countDays(req.start_date, req.end_date)} j)
                      </span>
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {LEAVE_LABELS[req.type]}
                    </p>
                    {req.comment && (
                      <p className="text-[12px] mt-1 italic" style={{ color: 'var(--text-tertiary)' }}>
                        &quot;{req.comment}&quot;
                      </p>
                    )}
                    {req.manager_comment && filter !== 'pending' && (
                      <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Réponse : &quot;{req.manager_comment}&quot;
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {filter === 'pending' && !isOpen && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        className="flex flex-1 md:flex-none items-center justify-center gap-1.5 text-[13px] transition-colors duration-150 py-2.5 px-4 md:py-1.5 md:px-3"
                        style={{
                          border: '0.5px solid var(--success)',
                          color: 'var(--success)',
                          borderRadius: '8px',
                          backgroundColor: 'transparent',
                        }}
                        onClick={() => { setActionId(req.id); setManagerComment(''); setActionError(null) }}
                      >
                        <CheckCircle className="h-4 w-4 md:h-3.5 md:w-3.5" /> Valider
                      </button>
                      <button
                        className="flex flex-1 md:flex-none items-center justify-center gap-1.5 text-[13px] transition-colors duration-150 py-2.5 px-4 md:py-1.5 md:px-3"
                        style={{
                          border: '0.5px solid var(--danger)',
                          color: 'var(--danger)',
                          borderRadius: '8px',
                          backgroundColor: 'transparent',
                        }}
                        onClick={() => handleAction(req.id, 'rejected')}
                        disabled={actionLoading}
                      >
                        {actionLoading
                          ? <Loader2 className="h-4 w-4 md:h-3.5 md:w-3.5 animate-spin" />
                          : <XCircle className="h-4 w-4 md:h-3.5 md:w-3.5" />}
                        {actionLoading ? 'Envoi...' : 'Refuser'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded approve form */}
                {isOpen && (
                  <div className="p-4 space-y-3" style={{ borderTop: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                    <Textarea
                      value={managerComment}
                      onChange={e => setManagerComment(e.target.value)}
                      placeholder="Message pour l'employé (optionnel)"
                      rows={2}
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)', fontSize: '13px' }}
                    />
                    {actionError && (
                      <p className="text-[12px]" style={{ color: 'var(--danger)' }}>{actionError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        className="flex items-center gap-1.5 text-[13px] text-white transition-colors duration-150"
                        style={{ backgroundColor: 'var(--success)', borderRadius: '8px', padding: '7px 14px' }}
                        onClick={() => handleAction(req.id, 'approved')}
                        disabled={actionLoading}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        {actionLoading ? 'Envoi...' : 'Confirmer la validation'}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => setActionId(null)}
                        disabled={actionLoading}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
