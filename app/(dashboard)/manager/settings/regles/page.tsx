'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Check } from 'lucide-react'

const AGREEMENTS = [
  { value: 'IDCC 1501', label: 'IDCC 1501 — Restauration Rapide' },
  { value: 'IDCC 1786', label: 'IDCC 1786 — Restauration Traditionnelle' },
  { value: 'Autre', label: 'Autre' },
]

const BREAK_TRIGGER_OPTIONS = [
  { value: '300', label: '5h00' },
  { value: '330', label: '5h30' },
  { value: '360', label: '6h00' },
  { value: '390', label: '6h30' },
  { value: '420', label: '7h00' },
]

type Settings = {
  collective_agreement: string
  opening_time: string
  closing_time: string
  break_trigger_minutes: string
  paid_breaks: string
  employer_charges_rate: string
  reference_work_days: string
  meal_allowance_enabled: string
}

const DEFAULTS: Settings = {
  collective_agreement: 'IDCC 1786',
  opening_time: '07:00',
  closing_time: '23:00',
  break_trigger_minutes: '360',
  paid_breaks: 'false',
  employer_charges_rate: '43',
  reference_work_days: '5',
  meal_allowance_enabled: 'false',
}

export default function ReglesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULTS)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        setSettings({
          collective_agreement: data.collective_agreement ?? DEFAULTS.collective_agreement,
          opening_time: data.opening_time ?? DEFAULTS.opening_time,
          closing_time: data.closing_time ?? DEFAULTS.closing_time,
          break_trigger_minutes: data.break_trigger_minutes ?? DEFAULTS.break_trigger_minutes,
          paid_breaks: data.paid_breaks ?? DEFAULTS.paid_breaks,
          employer_charges_rate: data.employer_charges_rate ?? DEFAULTS.employer_charges_rate,
          reference_work_days: data.reference_work_days ?? DEFAULTS.reference_work_days,
          meal_allowance_enabled: data.meal_allowance_enabled ?? DEFAULTS.meal_allowance_enabled,
        })
        setLoading(false)
      })
  }, [])

  function set<K extends keyof Settings>(key: K, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Règles & Compteurs</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configurez les règles légales et sociales applicables à votre établissement.
        </p>
      </div>

      {/* Convention collective */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Convention collective</CardTitle>
          <CardDescription>
            Détermine les règles légales applicables (repos, heures sup., primes).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={settings.collective_agreement} onValueChange={v => set('collective_agreement', v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGREEMENTS.map(a => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Horaires établissement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horaires de l&apos;établissement</CardTitle>
          <CardDescription>
            Plage d&apos;ouverture utilisée comme référence pour les alertes de planning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-1.5 flex-1">
              <Label>Ouverture</Label>
              <Input
                type="time"
                value={settings.opening_time}
                onChange={e => set('opening_time', e.target.value)}
              />
            </div>
            <div className="pt-6 text-muted-foreground">→</div>
            <div className="space-y-1.5 flex-1">
              <Label>Fermeture</Label>
              <Input
                type="time"
                value={settings.closing_time}
                onChange={e => set('closing_time', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pauses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Règles des pauses</CardTitle>
          <CardDescription>
            Seuil à partir duquel une pause obligatoire est déclenchée (légal : 6h).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Durée de travail avant déclenchement d&apos;une pause</Label>
            <Select value={settings.break_trigger_minutes} onValueChange={v => set('break_trigger_minutes', v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BREAK_TRIGGER_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Rémunération des pauses</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Si activé, les temps de pause sont comptabilisés dans les heures payées.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={settings.paid_breaks === 'true'}
              onClick={() => set('paid_breaks', settings.paid_breaks === 'true' ? 'false' : 'true')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                settings.paid_breaks === 'true' ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                settings.paid_breaks === 'true' ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Charges & Référence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paramètres salariaux</CardTitle>
          <CardDescription>
            Utilisés pour les estimations de coût dans le rapport.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Taux de charges patronales (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={settings.employer_charges_rate}
                  onChange={e => set('employer_charges_rate', e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Jours travaillés de référence</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  max="7"
                  step="1"
                  value={settings.reference_work_days}
                  onChange={e => set('reference_work_days', e.target.value)}
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">j/sem.</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indemnisation repas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indemnisation des repas</CardTitle>
          <CardDescription>
            Active la comptabilisation des indemnités repas dans le rapport de coût.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Activer l&apos;indemnisation des repas</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selon la convention, un repas est dû pour tout shift de plus de 5h.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={settings.meal_allowance_enabled === 'true'}
              onClick={() => set('meal_allowance_enabled', settings.meal_allowance_enabled === 'true' ? 'false' : 'true')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                settings.meal_allowance_enabled === 'true' ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                settings.meal_allowance_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[140px]">
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin" />Enregistrement…</>
            : saved
            ? <><Check className="h-4 w-4" />Enregistré !</>
            : 'Enregistrer les règles'
          }
        </Button>
      </div>
    </div>
  )
}
