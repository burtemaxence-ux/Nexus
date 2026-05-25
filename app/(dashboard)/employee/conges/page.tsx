'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, Trash2, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { LeaveRequest, LeaveType } from '@/types'

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: 'CP', label: 'Congés payés' },
  { value: 'RTT', label: 'RTT' },
  { value: 'maladie', label: 'Arrêt maladie' },
  { value: 'sans_solde', label: 'Sans solde' },
  { value: 'autre', label: 'Autre' },
]

function statusBadge(status: string) {
  if (status === 'approved') return (
    <span className="dp-badge-success inline-flex items-center gap-1">
      <CheckCircle className="h-3 w-3" /> Validé
    </span>
  )
  if (status === 'rejected') return (
    <span className="dp-badge-danger inline-flex items-center gap-1">
      <XCircle className="h-3 w-3" /> Refusé
    </span>
  )
  return (
    <span className="dp-badge-warning inline-flex items-center gap-1">
      <Clock className="h-3 w-3" /> En attente
    </span>
  )
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function countDays(start: string, end: string) {
  const ms = new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()
  return Math.round(ms / 86400000) + 1
}

export default function EmployeeCongesPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [type, setType] = useState<LeaveType>('CP')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/conges')
    if (res.ok) setRequests(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!startDate || !endDate) { setFormError('Veuillez renseigner les deux dates.'); return }
    if (endDate < startDate) { setFormError('La date de fin doit être après la date de début.'); return }
    setSubmitting(true)
    const res = await fetch('/api/conges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: startDate, end_date: endDate, type, comment }),
    })
    if (!res.ok) {
      const d = await res.json()
      setFormError(d.error ?? 'Erreur inconnue')
    } else {
      setShowForm(false)
      setStartDate(''); setEndDate(''); setComment('')
      fetchRequests()
    }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    setDeleteLoading(id)
    await fetch(`/api/conges/${id}`, { method: 'DELETE' })
    setDeleteLoading(null)
    fetchRequests()
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Link href="/employee" className="inline-flex items-center gap-1 text-[13px] transition-colors duration-150" style={{ color: 'var(--text-secondary)' }}>
          <ChevronLeft className="h-4 w-4" /> Mon espace
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>Mes congés</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Soumettez et suivez vos demandes d&apos;absence</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(null) }}
          disabled={showForm}
          className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Nouvelle demande
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-5 rounded-xl" style={{ border: '0.5px solid var(--accent)', backgroundColor: 'var(--accent-light)' }}>
          <p className="text-[13px] font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Nouvelle demande d&apos;absence</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start">Date de début</Label>
                <Input id="start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end">Date de fin</Label>
                <Input id="end" type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Type d&apos;absence</Label>
              <Select value={type} onValueChange={v => setType(v as LeaveType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comment">Commentaire (optionnel)</Label>
              <Textarea id="comment" value={comment} onChange={e => setComment(e.target.value)} placeholder="Précisions..." rows={2} />
            </div>
            {formError && (
              <p className="text-[13px]" style={{ color: 'var(--danger)' }}>{formError}</p>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-1.5 disabled:opacity-50">
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? 'Envoi...' : 'Envoyer la demande'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} disabled={submitting} className="btn-secondary">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Aucune demande</p>
          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            Cliquez sur &quot;Nouvelle demande&quot; pour soumettre votre première absence.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(req => (
            <div
              key={req.id}
              className="rounded-xl p-4 flex items-start justify-between gap-4"
              style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {statusBadge(req.status)}
                  <span className="text-[11px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
                    {LEAVE_TYPES.find(t => t.value === req.type)?.label}
                  </span>
                </div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {formatDate(req.start_date)}
                  {req.start_date !== req.end_date && <> → {formatDate(req.end_date)}</>}
                  <span className="ml-2 font-normal text-[12px]" style={{ color: 'var(--text-tertiary)' }}>({countDays(req.start_date, req.end_date)} j)</span>
                </p>
                {req.comment && <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>{req.comment}</p>}
                {req.manager_comment && (
                  <p className="text-[12px] mt-1 italic" style={{ color: 'var(--text-secondary)' }}>
                    Réponse : &quot;{req.manager_comment}&quot;
                  </p>
                )}
              </div>
              {req.status === 'pending' && (
                <button
                  onClick={() => handleDelete(req.id)}
                  disabled={deleteLoading === req.id}
                  className="flex-shrink-0 p-1.5 rounded-lg transition-colors duration-150 disabled:opacity-50"
                  style={{ color: 'var(--danger)' }}
                  title="Annuler la demande"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
