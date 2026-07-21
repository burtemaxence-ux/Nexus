'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, Trash2, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { LeaveRequest } from '@/types'
import {
  leaveTypeLabel,
  enabledLeaveTypes,
  parseLeaveConfig,
  LEAVE_TYPE_CODES,
  type LeaveType,
  type LeaveTypesConfig,
} from '@/lib/leaves'

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: 'rgba(0,212,170,0.12)', color: 'var(--success)', fontFamily: 'var(--font-dm-sans)' }}
    >
      ✓ Validé
    </span>
  )
  if (status === 'rejected') return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: 'rgba(255,107,107,0.12)', color: 'var(--danger)', fontFamily: 'var(--font-dm-sans)' }}
    >
      ✕ Refusé
    </span>
  )
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: 'rgba(255,179,71,0.12)', color: 'var(--warning)', fontFamily: 'var(--font-dm-sans)' }}
    >
      ◷ En attente
    </span>
  )
}

function LeaveTypeBadge({ type }: { type: LeaveType }) {
  const label = leaveTypeLabel(type)
  return (
    <span
      className="text-[10px] font-medium uppercase tracking-[0.06em]"
      style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}
    >
      {label}
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

// ── Leave form ────────────────────────────────────────────────────────────────

interface LeaveFormProps {
  startDate: string; endDate: string; type: LeaveType; comment: string
  submitting: boolean; formError: string | null
  typeOptions: LeaveType[]; leaveConfig: LeaveTypesConfig | null
  onStartDate(v: string): void; onEndDate(v: string): void
  onType(v: LeaveType): void; onComment(v: string): void
  onSubmit(e: React.FormEvent): void; onCancel(): void
}

function LeaveForm({
  startDate, endDate, type, comment, submitting, formError,
  typeOptions, leaveConfig,
  onStartDate, onEndDate, onType, onComment, onSubmit, onCancel,
}: LeaveFormProps) {
  const setting = leaveConfig?.[type] ?? null
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="start" style={{ fontFamily: 'var(--font-dm-sans)' }}>Date de début</Label>
          <Input id="start" type="date" value={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onStartDate(e.target.value)} required style={{ fontSize: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end" style={{ fontFamily: 'var(--font-dm-sans)' }}>Date de fin</Label>
          <Input id="end" type="date" value={endDate} min={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onEndDate(e.target.value)} required style={{ fontSize: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label style={{ fontFamily: 'var(--font-dm-sans)' }}>{"Type d'absence"}</Label>
        <Select value={type} onValueChange={(v: string) => onType(v as LeaveType)}>
          <SelectTrigger style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map(code => <SelectItem key={code} value={code}>{leaveTypeLabel(code)}</SelectItem>)}
          </SelectContent>
        </Select>
        {setting && (
          <p className="text-[12px]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
            {setting.validation === 'auto'
              ? '✓ Validée automatiquement dès l’envoi.'
              : 'Soumise à la validation de votre manager.'}
            {setting.notice_days > 0 && ` Prévenance recommandée : ${setting.notice_days} jour${setting.notice_days > 1 ? 's' : ''}.`}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="comment" style={{ fontFamily: 'var(--font-dm-sans)' }}>Commentaire (optionnel)</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onComment(e.target.value)}
          placeholder="Précisions..."
          rows={2}
          style={{ fontSize: '16px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>
      {formError && (
        <p className="text-[13px]" style={{ color: 'var(--danger)', fontFamily: 'var(--font-dm-sans)' }}>{formError}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary flex items-center justify-center gap-1.5 disabled:opacity-50 flex-1 md:flex-none"
          style={{ fontFamily: 'var(--font-manrope)' }}
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {submitting ? 'Envoi...' : 'Envoyer la demande'}
        </button>
        <button type="button" onClick={onCancel} disabled={submitting} className="btn-secondary" style={{ fontFamily: 'var(--font-dm-sans)' }}>
          Annuler
        </button>
      </div>
    </form>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

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
  const [leaveConfig, setLeaveConfig] = useState<LeaveTypesConfig | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/conges')
    if (res.ok) setRequests(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  // Types proposés selon les réglages de l'établissement (Réglages › Congés).
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        const config = parseLeaveConfig(data.leave_types_config)
        setLeaveConfig(config)
        const enabled = enabledLeaveTypes(config)
        setType(prev => (enabled.includes(prev) ? prev : enabled[0]))
      })
      .catch(() => {})
  }, [])

  const typeOptions = leaveConfig ? enabledLeaveTypes(leaveConfig) : [...LEAVE_TYPE_CODES]

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

  function openForm() { setShowForm(true); setFormError(null) }
  function closeForm() { if (!submitting) setShowForm(false) }

  const formProps: LeaveFormProps = {
    startDate, endDate, type, comment, submitting, formError,
    typeOptions, leaveConfig,
    onStartDate: setStartDate, onEndDate: setEndDate,
    onType: setType, onComment: setComment,
    onSubmit: handleSubmit, onCancel: closeForm,
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 md:px-6 md:py-8" style={{ backgroundColor: 'var(--bg-page)', minHeight: '100vh' }}>
      {/* Back link — desktop only */}
      <div className="hidden md:block mb-6">
        <Link href="/employee" className="inline-flex items-center gap-1 text-[13px] transition-colors duration-150" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-dm-sans)' }}>
          <ChevronLeft className="h-4 w-4" /> Mon espace
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8 dashboard-s0">
        <div>
          <h1
            className="text-[20px] font-bold tracking-[-0.02em]"
            style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-primary)' }}
          >
            Mes congés
          </h1>
          <p className="text-[13px] mt-0.5" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-secondary)' }}>
            Soumettez et suivez vos demandes d&apos;absence
          </p>
        </div>
        <button
          onClick={openForm}
          disabled={showForm}
          className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
          style={{ fontFamily: 'var(--font-manrope)' }}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nouvelle demande</span>
          <span className="sm:hidden">Nouveau</span>
        </button>
      </div>

      {/* Desktop: inline form */}
      {showForm && (
        <div
          className="hidden md:block mb-6 p-5 rounded-[14px] dashboard-s1"
          style={{ border: '1px solid var(--accent)', backgroundColor: 'rgba(108,99,255,0.06)' }}
        >
          <p className="text-[13px] font-semibold mb-4" style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-primary)' }}>
            Nouvelle demande d&apos;absence
          </p>
          <LeaveForm {...formProps} />
        </div>
      )}

      {/* Mobile: bottom sheet */}
      {showForm && (
        <div className="md:hidden">
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeForm} />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[20px]"
            style={{ background: 'var(--bg-card)', paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))', border: '1px solid var(--border)' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-hover)' }} />
            </div>
            <div className="flex items-center justify-between px-5 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-[14px] font-semibold" style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-primary)' }}>
                Nouvelle demande
              </span>
              <button onClick={closeForm} className="p-1.5 rounded-lg" style={{ color: 'var(--text-tertiary)' }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-4 overflow-y-auto max-h-[75vh]">
              <LeaveForm {...formProps} />
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center dashboard-s1">
          <p className="text-[13px] font-semibold mb-1" style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-secondary)' }}>
            Aucune demande
          </p>
          <p className="text-[12px]" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}>
            Cliquez sur &quot;Nouvelle demande&quot; pour soumettre votre première absence.
          </p>
        </div>
      ) : (
        <div className="space-y-2 dashboard-s1">
          {requests.map((req: LeaveRequest) => (
            <div
              key={req.id}
              className="rounded-[14px] p-4 flex items-start justify-between gap-3 transition-all duration-150"
              style={{
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-card)',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <StatusBadge status={req.status} />
                  <LeaveTypeBadge type={req.type as LeaveType} />
                </div>
                <p
                  className="text-[14px] font-bold"
                  style={{ fontFamily: 'var(--font-manrope)', color: 'var(--text-primary)' }}
                >
                  {formatDate(req.start_date)}
                  {req.start_date !== req.end_date && (
                    <span className="font-normal mx-1.5" style={{ color: 'var(--text-tertiary)' }}>→</span>
                  )}
                  {req.start_date !== req.end_date && formatDate(req.end_date)}
                  <span
                    className="ml-2 text-[12px] font-normal"
                    style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-tertiary)' }}
                  >
                    ({countDays(req.start_date, req.end_date)} j)
                  </span>
                </p>
                {req.comment && (
                  <p className="text-[12px] mt-1" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-secondary)' }}>
                    {req.comment}
                  </p>
                )}
                {req.manager_comment && (
                  <p className="text-[12px] mt-1 italic" style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--text-secondary)' }}>
                    Réponse : &quot;{req.manager_comment}&quot;
                  </p>
                )}
              </div>

              {req.status === 'pending' && (
                <button
                  onClick={() => handleDelete(req.id)}
                  disabled={deleteLoading === req.id}
                  className="flex-shrink-0 flex items-center gap-1.5 rounded-lg p-1.5 transition-colors disabled:opacity-50"
                  style={{ color: 'var(--danger)' }}
                  title="Annuler la demande"
                >
                  {deleteLoading === req.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />
                  }
                  <span className="text-[12px] font-medium md:hidden" style={{ fontFamily: 'var(--font-dm-sans)' }}>Annuler</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
