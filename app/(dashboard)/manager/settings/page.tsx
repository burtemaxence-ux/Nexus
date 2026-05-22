'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Clock, Save, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

const BREAK_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 heure' },
  { value: 90, label: '1h30' },
]

export default function SettingsPage() {
  const [breakLimit, setBreakLimit] = useState<number>(30)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => setBreakLimit(parseInt(s.break_minutes_limit ?? '30', 10)))
      .catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ break_minutes_limit: String(breakLimit) }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError('Erreur lors de l\'enregistrement.')
    }
    setSaving(false)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/manager" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />Tableau de bord
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500 mt-1 text-sm">Configuration de votre établissement</p>
      </div>

      <div className="space-y-4">

        {/* Durée de pause */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Durée de pause autorisée</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Durée maximale de pause par jour, visible et contrôlée depuis la badgeuse.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
            {BREAK_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setBreakLimit(opt.value)}
                className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  breakLimit === opt.value
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Réglage actuel : <span className="font-semibold text-gray-600">{breakLimit} minutes</span> par journée de travail.
            Les employés peuvent fractionner leur pause en plusieurs fois tant que le total ne dépasse pas cette limite.
          </p>

          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement…' : saved ? 'Enregistré !' : 'Enregistrer'}
          </Button>
        </div>

        {/* Lien postes */}
        <Link
          href="/manager/settings/postes"
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Settings className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Postes & couleurs</p>
              <p className="text-xs text-gray-500">Gérer les postes de votre établissement</p>
            </div>
          </div>
          <ChevronLeft className="h-4 w-4 text-gray-400 rotate-180" />
        </Link>

      </div>
    </div>
  )
}
