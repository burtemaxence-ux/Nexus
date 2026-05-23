'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Check } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

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

const MIN_SHIFT_OPTIONS = [
  { value: '15',  label: '15 min' },
  { value: '30',  label: '30 min' },
  { value: '60',  label: '1h' },
  { value: '120', label: '2h' },
]

const MAX_SHIFT_OPTIONS = [
  { value: '240', label: '4h' },
  { value: '360', label: '6h' },
  { value: '480', label: '8h' },
  { value: '600', label: '10h' },
  { value: '720', label: '12h' },
  { value: '840', label: '14h' },
]

const REST_OPTIONS = [
  { value: '8',  label: '8h' },
  { value: '9',  label: '9h' },
  { value: '10', label: '10h' },
  { value: '11', label: '11h (légal)' },
  { value: '12', label: '12h' },
]

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// ── Types ─────────────────────────────────────────────────────────────────────

type Settings = {
  // existing
  collective_agreement: string
  opening_time: string
  closing_time: string
  break_trigger_minutes: string
  paid_breaks: string
  employer_charges_rate: string
  reference_work_days: string
  meal_allowance_enabled: string
  // new — Section 3
  min_shift_duration: string
  max_shift_duration: string
  min_rest_hours: string
  overtime_allowed: string
  color_shift: string
  color_absence: string
  color_conge: string
  color_overtime: string
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
  min_shift_duration: '30',
  max_shift_duration: '600',
  min_rest_hours: '11',
  overtime_allowed: 'true',
  color_shift: '#3B82F6',
  color_absence: '#EF4444',
  color_conge: '#10B981',
  color_overtime: '#F59E0B',
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReglesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [closedDays, setClosedDays] = useState<number[]>([])

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        setSettings({
          collective_agreement:  data.collective_agreement  ?? DEFAULTS.collective_agreement,
          opening_time:          data.opening_time          ?? DEFAULTS.opening_time,
          closing_time:          data.closing_time          ?? DEFAULTS.closing_time,
          break_trigger_minutes: data.break_trigger_minutes ?? DEFAULTS.break_trigger_minutes,
          paid_breaks:           data.paid_breaks           ?? DEFAULTS.paid_breaks,
          employer_charges_rate: data.employer_charges_rate ?? DEFAULTS.employer_charges_rate,
          reference_work_days:   data.reference_work_days   ?? DEFAULTS.reference_work_days,
          meal_allowance_enabled:data.meal_allowance_enabled?? DEFAULTS.meal_allowance_enabled,
          min_shift_duration:    data.min_shift_duration    ?? DEFAULTS.min_shift_duration,
          max_shift_duration:    data.max_shift_duration    ?? DEFAULTS.max_shift_duration,
          min_rest_hours:        data.min_rest_hours        ?? DEFAULTS.min_rest_hours,
          overtime_allowed:      data.overtime_allowed      ?? DEFAULTS.overtime_allowed,
          color_shift:           data.color_shift           ?? DEFAULTS.color_shift,
          color_absence:         data.color_absence         ?? DEFAULTS.color_absence,
          color_conge:           data.color_conge           ?? DEFAULTS.color_conge,
          color_overtime:        data.color_overtime        ?? DEFAULTS.color_overtime,
        })
        if (data.closed_days) {
          try { setClosedDays(JSON.parse(data.closed_days)) } catch { /* keep empty */ }
        }
        setLoading(false)
      })
  }, [])

  function set<K extends keyof Settings>(key: K, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  function toggleDay(idx: number) {
    setClosedDays(prev =>
      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
    )
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...settings,
        closed_days: JSON.stringify(closedDays),
      }),
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
    <div className="max-w-2xl mx-auto px-8 py-10 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Planning</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Règles de planification, horaires et personnalisation visuelle.
        </p>
      </div>

      {/* ── Convention collective ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Convention collective</CardTitle>
          <CardDescription>
            Détermine les règles légales applicables (repos, heures sup., primes).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={settings.collective_agreement} onValueChange={v => set('collective_agreement', v)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AGREEMENTS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* ── Horaires établissement ────────────────────────────────────── */}
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
              <Input type="time" value={settings.opening_time} onChange={e => set('opening_time', e.target.value)} />
            </div>
            <div className="pt-6 text-muted-foreground">→</div>
            <div className="space-y-1.5 flex-1">
              <Label>Fermeture</Label>
              <Input type="time" value={settings.closing_time} onChange={e => set('closing_time', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Règles de planification (NEW) ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Règles de planification</CardTitle>
          <CardDescription>
            Contraintes appliquées lors de la création des créneaux.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Durée minimum d&apos;un créneau</Label>
              <Select value={settings.min_shift_duration} onValueChange={v => set('min_shift_duration', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MIN_SHIFT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Durée maximum d&apos;un créneau</Label>
              <Select value={settings.max_shift_duration} onValueChange={v => set('max_shift_duration', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MAX_SHIFT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Repos minimum entre deux shifts</Label>
            <Select value={settings.min_rest_hours} onValueChange={v => set('min_rest_hours', v)}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REST_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Heures supplémentaires autorisées</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Si désactivé, une alerte bloquante empêche de planifier au-delà du contrat.
              </p>
            </div>
            <Toggle
              checked={settings.overtime_allowed === 'true'}
              onToggle={() => set('overtime_allowed', settings.overtime_allowed === 'true' ? 'false' : 'true')}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Jours de fermeture (NEW) ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jours de fermeture</CardTitle>
          <CardDescription>
            Les jours sélectionnés sont marqués comme fermés sur la grille de planning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {WEEK_DAYS.map((day, idx) => {
              const closed = closedDays.includes(idx)
              return (
                <button
                  key={idx}
                  onClick={() => toggleDay(idx)}
                  className={`h-9 w-12 rounded-lg border text-sm font-medium transition-colors ${
                    closed
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
          {closedDays.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Fermé le{closedDays.length > 1 ? 's' : ''} : {closedDays.sort().map(d => WEEK_DAYS[d]).join(', ')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Règles des pauses (existing) ─────────────────────────────── */}
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
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BREAK_TRIGGER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
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
            <Toggle
              checked={settings.paid_breaks === 'true'}
              onToggle={() => set('paid_breaks', settings.paid_breaks === 'true' ? 'false' : 'true')}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Paramètres salariaux (existing) ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paramètres salariaux</CardTitle>
          <CardDescription>Utilisés pour les estimations de coût dans le rapport.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Taux de charges patronales (%)</Label>
              <div className="relative">
                <Input type="number" min="0" max="100" step="0.5" value={settings.employer_charges_rate}
                  onChange={e => set('employer_charges_rate', e.target.value)} className="pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Jours travaillés de référence</Label>
              <div className="relative">
                <Input type="number" min="1" max="7" step="1" value={settings.reference_work_days}
                  onChange={e => set('reference_work_days', e.target.value)} className="pr-16" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">j/sem.</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Indemnisation repas (existing) ───────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indemnisation des repas</CardTitle>
          <CardDescription>Active la comptabilisation des indemnités repas dans le rapport de coût.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Activer l&apos;indemnisation des repas</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selon la convention, un repas est dû pour tout shift de plus de 5h.
              </p>
            </div>
            <Toggle
              checked={settings.meal_allowance_enabled === 'true'}
              onToggle={() => set('meal_allowance_enabled', settings.meal_allowance_enabled === 'true' ? 'false' : 'true')}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Couleurs du planning (NEW) ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Couleurs du planning</CardTitle>
          <CardDescription>
            Personnalisez les couleurs affichées sur la grille de planning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-5">
            {[
              { key: 'color_shift'    as const, label: 'Shift normal' },
              { key: 'color_absence'  as const, label: 'Absence' },
              { key: 'color_conge'    as const, label: 'Congé' },
              { key: 'color_overtime' as const, label: 'Heures sup.' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings[key]}
                  onChange={e => set(key, e.target.value)}
                  className="h-9 w-12 rounded-lg border border-input cursor-pointer p-0.5 shrink-0"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs font-mono text-muted-foreground">{settings[key]}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Save ──────────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[140px]">
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin" />Enregistrement…</>
            : saved
            ? <><Check className="h-4 w-4" />Enregistré !</>
            : 'Enregistrer'
          }
        </Button>
      </div>
    </div>
  )
}
