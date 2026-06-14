'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, X, Check, Clock } from 'lucide-react'

const MY_LEAVES = [
  {
    id: '1',
    type: 'CP',
    typeLabel: 'Congés payés',
    startDate: '2026-07-14',
    endDate: '2026-07-25',
    days: 12,
    status: 'pending' as const,
    comment: 'Vacances d\'été',
  },
]

const BALANCES = [
  { label: 'Congés payés', value: '12j', color: '#6C63FF' },
  { label: 'RTT',          value: '2j',  color: '#00D4AA' },
  { label: 'Récup',        value: '0j',  color: '#9090a8' },
]

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'refused' }) {
  if (status === 'approved') return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,212,170,0.12)', color: 'var(--success)' }}>
      <Check className="h-3 w-3" /> Validé
    </span>
  )
  if (status === 'refused') return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,107,107,0.12)', color: 'var(--danger)' }}>
      <X className="h-3 w-3" /> Refusé
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,179,71,0.12)', color: 'var(--warning)' }}>
      <Clock className="h-3 w-3" /> En attente
    </span>
  )
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const LEAVE_TYPES = [
  { value: 'CP',          label: 'Congés payés' },
  { value: 'RTT',         label: 'RTT' },
  { value: 'maladie',     label: 'Arrêt maladie' },
  { value: 'sans_solde',  label: 'Sans solde' },
  { value: 'autre',       label: 'Autre' },
]

export default function EmployeeLeavesPage() {
  const [showModal, setShowModal] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [type, setType] = useState('CP')
  const [comment, setComment] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setShowModal(false)
    setStartDate(''); setEndDate(''); setComment('')
    toast.success('Demande envoyée ✓ — mode démo')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 md:px-6 md:py-8" style={{ backgroundColor: 'var(--bg-page)', minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 dashboard-s0">
        <div>
          <h1 className="text-[20px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
            Mes congés
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Soumettez et suivez vos demandes d&apos;absence
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary" style={{ fontFamily: 'var(--font-syne)' }}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nouvelle demande</span>
          <span className="sm:hidden">Nouveau</span>
        </button>
      </div>

      {/* Soldes */}
      <div className="grid grid-cols-3 gap-3 mb-6 dashboard-s1">
        {BALANCES.map(b => (
          <div key={b.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
            <p className="text-[24px] font-bold" style={{ fontFamily: 'var(--font-syne)', color: b.color }}>{b.value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{b.label}</p>
          </div>
        ))}
      </div>

      {/* Demandes */}
      <div className="space-y-2 dashboard-s1">
        {MY_LEAVES.map(req => (
          <div
            key={req.id}
            className="rounded-[14px] p-4"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
          >
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <StatusBadge status={req.status} />
              <span className="text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
                {req.typeLabel}
              </span>
            </div>
            <p className="text-[14px] font-bold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
              {formatDate(req.startDate)}
              <span className="font-normal mx-1.5" style={{ color: 'var(--text-tertiary)' }}>→</span>
              {formatDate(req.endDate)}
              <span className="ml-2 text-[12px] font-normal" style={{ color: 'var(--text-tertiary)' }}>({req.days} j)</span>
            </p>
            {req.comment && (
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>{req.comment}</p>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowModal(false)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[20px] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:rounded-[20px]"
            style={{ background: 'var(--bg-card)', paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))', border: '1px solid var(--border)' }}
          >
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-hover)' }} />
            </div>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-[14px] font-semibold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
                Nouvelle demande
              </span>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-tertiary)' }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] mb-1.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-dm-sans)' }}>Date de début</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    required
                    className="dp-input"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div>
                  <label className="block text-[12px] mb-1.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-dm-sans)' }}>Date de fin</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={e => setEndDate(e.target.value)}
                    required
                    className="dp-input"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] mb-1.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-dm-sans)' }}>Type d&apos;absence</label>
                <select value={type} onChange={e => setType(e.target.value)} className="dp-input">
                  {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] mb-1.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-dm-sans)' }}>Commentaire (optionnel)</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Précisions..."
                  rows={2}
                  className="dp-input resize-none"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1" style={{ fontFamily: 'var(--font-syne)' }}>
                  Envoyer la demande
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </>
      )}

    </div>
  )
}
