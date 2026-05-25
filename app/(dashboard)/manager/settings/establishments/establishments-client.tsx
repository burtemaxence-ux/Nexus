'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Store, Plus, Check, Loader2, Building2 } from 'lucide-react'

interface Establishment {
  id: string
  name: string
  createdAt: string
  role: 'manager' | 'supervisor'
}

interface Props {
  establishments: Establishment[]
  activeEstablishmentId: string
  callerRole: 'manager' | 'supervisor' | 'employee'
}

export default function EstablishmentsClient({ establishments, activeEstablishmentId, callerRole }: Props) {
  const router = useRouter()
  const isManager = callerRole === 'manager'

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleSwitch(id: string) {
    if (id === activeEstablishmentId || switching) return
    setSwitching(id)
    try {
      const res = await fetch('/api/establishments/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ establishment_id: id }),
      })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? 'Erreur lors du changement')
        return
      }
      router.refresh()
    } finally {
      setSwitching(null)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/establishments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const j = await res.json()
      if (!res.ok) {
        setError(j.error ?? 'Erreur lors de la création')
        return
      }
      setName('')
      setShowForm(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>Établissements</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Gérez vos sites et basculez entre eux depuis la barre de navigation.
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => { setShowForm(true); setError('') }}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un site
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-5 p-4 rounded-xl" style={{ backgroundColor: 'var(--accent-light)', border: '0.5px solid var(--accent)' }}>
          <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Nom du nouvel établissement</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex : Restaurant Lyon Part-Dieu"
              autoFocus
              className="dp-input flex-1 px-3 py-2 text-[13px]"
            />
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Créer
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setName(''); setError('') }}
              className="btn-secondary"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-[13px]" style={{ backgroundColor: '#FEE2E2', border: '0.5px solid var(--danger)', color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {/* Establishments list */}
      {establishments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-10 w-10 mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Aucun établissement trouvé.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {establishments.map(est => {
            const isActive = est.id === activeEstablishmentId
            const isLoading = switching === est.id
            return (
              <div
                key={est.id}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors duration-150"
                style={{
                  border: isActive ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
                  backgroundColor: isActive ? 'var(--accent-light)' : 'var(--bg-card)',
                }}
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isActive ? 'var(--accent-light)' : 'var(--bg-page)' }}
                >
                  <Store className="h-4 w-4" style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {est.name}
                  </p>
                  <p className="text-[11px] mt-0.5 capitalize" style={{ color: 'var(--text-tertiary)' }}>{est.role}</p>
                </div>

                {isActive ? (
                  <span className="dp-badge-info flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Actif
                  </span>
                ) : (
                  <button
                    onClick={() => handleSwitch(est.id)}
                    disabled={!!switching}
                    className="btn-secondary flex items-center gap-1.5 text-[12px] disabled:opacity-50"
                  >
                    {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    Activer
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {establishments.length > 0 && (
        <p className="mt-5 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
          L&apos;établissement actif détermine les données affichées dans toute l&apos;application. Vous pouvez aussi basculer depuis la barre de navigation.
        </p>
      )}
    </div>
  )
}
