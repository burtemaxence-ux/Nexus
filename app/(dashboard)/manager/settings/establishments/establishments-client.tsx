'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Store, Plus, Check, Loader2, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
          <h1 className="text-xl font-semibold text-gray-900">Établissements</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gérez vos sites et basculez entre eux depuis la barre latérale.
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => { setShowForm(true); setError('') }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#4F46E5] text-white text-sm font-medium rounded-lg hover:bg-[#4338CA] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ajouter un site
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-5 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
          <p className="text-sm font-medium text-gray-700 mb-3">Nom du nouvel établissement</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex : Restaurant Lyon Part-Dieu"
              autoFocus
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]"
            />
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="px-4 py-2 bg-[#4F46E5] text-white text-sm font-medium rounded-lg hover:bg-[#4338CA] disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Créer
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setName(''); setError('') }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Establishments list */}
      {establishments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Aucun établissement trouvé.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {establishments.map(est => {
            const isActive = est.id === activeEstablishmentId
            const isLoading = switching === est.id
            return (
              <div
                key={est.id}
                className={cn(
                  'flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all',
                  isActive
                    ? 'border-[#4F46E5]/30 bg-[#4F46E5]/5'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <div className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0',
                  isActive ? 'bg-[#4F46E5]/20' : 'bg-gray-100'
                )}>
                  <Store className={cn('h-4 w-4', isActive ? 'text-[#4F46E5]' : 'text-gray-400')} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', isActive ? 'text-[#4F46E5]' : 'text-gray-800')}>
                    {est.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{est.role}</p>
                </div>

                {isActive ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-[#4F46E5] bg-[#4F46E5]/10 px-2.5 py-1 rounded-full">
                    <Check className="h-3 w-3" />
                    Actif
                  </span>
                ) : (
                  <button
                    onClick={() => handleSwitch(est.id)}
                    disabled={!!switching}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
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
        <p className="mt-5 text-xs text-gray-400">
          L&apos;établissement actif détermine les données affichées dans toute l&apos;application. Vous pouvez aussi basculer depuis la barre latérale.
        </p>
      )}
    </div>
  )
}
