'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

export default function ManagerCongesPage() {
  const [requests, setRequests] = useState<LeaveRequestWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [actionId, setActionId] = useState<string | null>(null)
  const [managerComment, setManagerComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/conges')
    if (res.ok) setRequests(await res.json())
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
    }
    setActionLoading(false)
  }

  const filtered = requests.filter(r => r.status === filter)
  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/manager" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Tableau de bord
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Demandes de congés</h1>
        <p className="text-gray-500 mt-1 text-sm">Validez ou refusez les demandes de votre équipe</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-6">
        {([
          { key: 'pending', label: 'En attente', icon: Clock },
          { key: 'approved', label: 'Validés', icon: CheckCircle },
          { key: 'rejected', label: 'Refusés', icon: XCircle },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {key === 'pending' && pendingCount > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-base font-medium text-gray-500">Aucune demande {filter === 'pending' ? 'en attente' : filter === 'approved' ? 'validée' : 'refusée'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const emp = req.profiles
            const isOpen = actionId === req.id
            return (
              <div key={req.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Employee */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
                        {(emp.full_name ?? emp.email).slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-900 text-sm">{emp.full_name ?? emp.email}</span>
                      {emp.position && <span className="text-xs text-gray-400">{emp.position}</span>}
                    </div>
                    {/* Dates */}
                    <p className="text-sm text-gray-800 font-medium">
                      {formatDate(req.start_date)}{req.start_date !== req.end_date && <> → {formatDate(req.end_date)}</>}
                      <span className="ml-2 text-gray-400 font-normal text-xs">({countDays(req.start_date, req.end_date)} j)</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{LEAVE_LABELS[req.type]}</p>
                    {req.comment && <p className="text-xs text-gray-400 mt-1 italic">&quot;{req.comment}&quot;</p>}
                    {req.manager_comment && filter !== 'pending' && (
                      <p className="text-xs text-gray-500 mt-1">Réponse : &quot;{req.manager_comment}&quot;</p>
                    )}
                  </div>

                  {/* Actions */}
                  {filter === 'pending' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isOpen ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 border-green-300 text-green-700 hover:bg-green-50"
                            onClick={() => { setActionId(req.id); setManagerComment(''); setActionError(null) }}
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Valider
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => handleAction(req.id, 'rejected')}
                            disabled={actionLoading}
                          >
                            <XCircle className="h-3.5 w-3.5" /> Refuser
                          </Button>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Expanded approve form */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    <Textarea
                      value={managerComment}
                      onChange={e => setManagerComment(e.target.value)}
                      placeholder="Message pour l'employé (optionnel)"
                      rows={2}
                      className="bg-white"
                    />
                    {actionError && <p className="text-sm text-red-600">{actionError}</p>}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="gap-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleAction(req.id, 'approved')}
                        disabled={actionLoading}
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> {actionLoading ? 'Envoi...' : 'Confirmer la validation'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setActionId(null)} disabled={actionLoading}>
                        Annuler
                      </Button>
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
