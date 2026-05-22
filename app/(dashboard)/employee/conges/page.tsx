'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
      <CheckCircle className="h-3 w-3" /> Validé
    </span>
  )
  if (status === 'rejected') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      <XCircle className="h-3 w-3" /> Refusé
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
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
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/employee" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Mon espace
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes congés</h1>
          <p className="text-gray-500 mt-1 text-sm">Soumettez et suivez vos demandes d&apos;absence</p>
        </div>
        <Button onClick={() => { setShowForm(true); setFormError(null) }} disabled={showForm}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle demande
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="mb-6 border-blue-200 bg-blue-50/30">
          <CardHeader><CardTitle className="text-base">Nouvelle demande d&apos;absence</CardTitle></CardHeader>
          <CardContent>
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
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>{submitting ? 'Envoi...' : 'Envoyer la demande'}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>Annuler</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <p className="text-center text-gray-400 py-12">Chargement...</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium text-gray-500 mb-1">Aucune demande</p>
          <p className="text-sm">Cliquez sur &quot;Nouvelle demande&quot; pour soumettre votre première absence.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {statusBadge(req.status)}
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                    {LEAVE_TYPES.find(t => t.value === req.type)?.label}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(req.start_date)}
                  {req.start_date !== req.end_date && <> → {formatDate(req.end_date)}</>}
                  <span className="ml-2 font-normal text-gray-400 text-xs">({countDays(req.start_date, req.end_date)} j)</span>
                </p>
                {req.comment && <p className="text-xs text-gray-500 mt-1">{req.comment}</p>}
                {req.manager_comment && (
                  <p className="text-xs mt-1 italic text-gray-600">
                    Réponse : &quot;{req.manager_comment}&quot;
                  </p>
                )}
              </div>
              {req.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                  onClick={() => handleDelete(req.id)}
                  disabled={deleteLoading === req.id}
                  title="Annuler la demande"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
