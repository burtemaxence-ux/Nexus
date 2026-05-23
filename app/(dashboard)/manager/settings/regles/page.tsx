'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Check, ChevronRight, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Activity types ────────────────────────────────────────────────────────────

const ACTIVITY_TYPES = [
  { id: 'fast_food',      label: 'Restauration rapide',        emoji: '🍔' },
  { id: 'restaurant',     label: 'Restauration traditionnelle', emoji: '🍽️' },
  { id: 'bakery',         label: 'Boulangerie / Pâtisserie',   emoji: '🥐' },
  { id: 'hotel',          label: 'Hôtellerie',                 emoji: '🏨' },
  { id: 'catering',       label: 'Traiteur / Événementiel',    emoji: '🎪' },
  { id: 'camping',        label: 'Hôtellerie de plein air',    emoji: '🏕️' },
  { id: 'pizza',          label: 'Pizzeria',                   emoji: '🍕' },
  { id: 'cafe',           label: 'Café / Bar / Brasserie',     emoji: '☕' },
  { id: 'food_industry',  label: 'Industrie alimentaire',      emoji: '🏭' },
  { id: 'other',          label: 'Autre',                      emoji: '🔧' },
] as const

type ActivityTypeId = (typeof ACTIVITY_TYPES)[number]['id']

// ── Conventions data ──────────────────────────────────────────────────────────

type ConventionData = {
  code: string
  label: string
  weekly_hours: string
  overtime_from: string
  rest_hours: string
  notes: string
}

const CONVENTIONS: Record<string, ConventionData> = {
  'IDCC 1501': {
    code: 'IDCC 1501', label: 'Restauration Rapide',
    weekly_hours: '35h', overtime_from: '36h', rest_hours: '11h',
    notes: 'Majoration 10 % entre 36h et 43h, puis 25 % au-delà.',
  },
  'IDCC 1786': {
    code: 'IDCC 1786', label: 'CHR — Cafés Hôtels Restaurants',
    weekly_hours: '39h (équivalences)', overtime_from: '36h', rest_hours: '11h',
    notes: 'Régime des équivalences : 39h réelles = 35h légales pour hôtels et restaurants.',
  },
  'IDCC 1286': {
    code: 'IDCC 1286', label: 'CHR — ancienne convention',
    weekly_hours: '39h', overtime_from: '36h', rest_hours: '11h',
    notes: 'Convention antérieure à la CCN CHR 1997, encore appliquée dans certains établissements.',
  },
  'IDCC 3061': {
    code: 'IDCC 3061', label: 'Boulangerie-Pâtisserie Artisanale',
    weekly_hours: '35h', overtime_from: '36h', rest_hours: '11h',
    notes: 'Travail dominical fréquent avec compensations spécifiques. Travail de nuit dès 21h.',
  },
  'IDCC 2601': {
    code: 'IDCC 2601', label: 'Boulangerie Industrielle',
    weekly_hours: '35h', overtime_from: '36h', rest_hours: '11h',
    notes: 'Majoration nuit et dimanche. Modulation annuelle possible.',
  },
  'IDCC 1979': {
    code: 'IDCC 1979', label: 'Hôtellerie',
    weekly_hours: '39h (équivalences)', overtime_from: '36h', rest_hours: '11h',
    notes: 'Équivalences similaires à la CCN CHR. Repos compensateur obligatoire.',
  },
  'IDCC 1938': {
    code: 'IDCC 1938', label: 'Traiteurs et Organisateurs de Réceptions',
    weekly_hours: '35h', overtime_from: '36h', rest_hours: '11h',
    notes: 'Modulation du temps de travail largement utilisée. Majorations week-end.',
  },
  'IDCC 2060': {
    code: 'IDCC 2060', label: 'Hôtellerie de Plein Air',
    weekly_hours: '35h', overtime_from: '36h', rest_hours: '11h',
    notes: 'Saisonnalité importante. Repos compensateur et repos hebdomadaire spécifiques.',
  },
  'IDCC 2584': {
    code: 'IDCC 2584', label: 'Pizzerias et Assimilés',
    weekly_hours: '39h (équivalences)', overtime_from: '36h', rest_hours: '11h',
    notes: 'Rattaché aux conventions CHR pour les pizzerias avec service à table.',
  },
}

const ACTIVITY_CONVENTIONS: Record<ActivityTypeId, string[]> = {
  fast_food:    ['IDCC 1501'],
  restaurant:   ['IDCC 1786', 'IDCC 1286'],
  bakery:       ['IDCC 3061', 'IDCC 2601'],
  hotel:        ['IDCC 1979', 'IDCC 1786'],
  catering:     ['IDCC 1938'],
  camping:      ['IDCC 2060'],
  pizza:        ['IDCC 2584'],
  cafe:         ['IDCC 1786', 'IDCC 1286'],
  food_industry:['IDCC 2601'],
  other:        [],
}

// ── Other constants ───────────────────────────────────────────────────────────

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
  collective_agreement: string
  opening_time: string
  closing_time: string
  break_trigger_minutes: string
  paid_breaks: string
  employer_charges_rate: string
  reference_work_days: string
  meal_allowance_enabled: string
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

// ── Toggle ────────────────────────────────────────────────────────────────────

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

  // Convention collective
  const [activityType, setActivityType] = useState<ActivityTypeId | ''>('')
  const [customAgreement, setCustomAgreement] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        setSettings({
          collective_agreement:   data.collective_agreement   ?? DEFAULTS.collective_agreement,
          opening_time:           data.opening_time           ?? DEFAULTS.opening_time,
          closing_time:           data.closing_time           ?? DEFAULTS.closing_time,
          break_trigger_minutes:  data.break_trigger_minutes  ?? DEFAULTS.break_trigger_minutes,
          paid_breaks:            data.paid_breaks            ?? DEFAULTS.paid_breaks,
          employer_charges_rate:  data.employer_charges_rate  ?? DEFAULTS.employer_charges_rate,
          reference_work_days:    data.reference_work_days    ?? DEFAULTS.reference_work_days,
          meal_allowance_enabled: data.meal_allowance_enabled ?? DEFAULTS.meal_allowance_enabled,
          min_shift_duration:     data.min_shift_duration     ?? DEFAULTS.min_shift_duration,
          max_shift_duration:     data.max_shift_duration     ?? DEFAULTS.max_shift_duration,
          min_rest_hours:         data.min_rest_hours         ?? DEFAULTS.min_rest_hours,
          overtime_allowed:       data.overtime_allowed       ?? DEFAULTS.overtime_allowed,
          color_shift:            data.color_shift            ?? DEFAULTS.color_shift,
          color_absence:          data.color_absence          ?? DEFAULTS.color_absence,
          color_conge:            data.color_conge            ?? DEFAULTS.color_conge,
          color_overtime:         data.color_overtime         ?? DEFAULTS.color_overtime,
        })
        if (data.closed_days) {
          try { setClosedDays(JSON.parse(data.closed_days)) } catch { /* keep empty */ }
        }
        if (data.activity_type) setActivityType(data.activity_type as ActivityTypeId)
        if (data.collective_agreement_custom) setCustomAgreement(data.collective_agreement_custom)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function set<K extends keyof Settings>(key: K, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  function toggleDay(idx: number) {
    setClosedDays(prev =>
      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
    )
  }

  function selectActivityType(id: ActivityTypeId) {
    setActivityType(id)
    // Auto-select convention if only one option
    const options = ACTIVITY_CONVENTIONS[id]
    if (options.length === 1) set('collective_agreement', options[0])
    else if (id === 'other') set('collective_agreement', 'Autre')
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...settings,
        closed_days: JSON.stringify(closedDays),
        activity_type: activityType,
        collective_agreement_custom: customAgreement,
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

  // Convention details for the selected agreement
  const conventionDetails = settings.collective_agreement !== 'Autre'
    ? CONVENTIONS[settings.collective_agreement]
    : null

  const availableConventions = activityType ? ACTIVITY_CONVENTIONS[activityType] : null

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
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-base">Convention collective</CardTitle>
              <CardDescription>
                Détermine les règles légales applicables (repos, heures sup., primes).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Step 1 — Activity type */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Étape 1 — Type d&apos;activité
            </p>
            <div className="grid grid-cols-5 gap-2">
              {ACTIVITY_TYPES.map(at => (
                <button
                  key={at.id}
                  onClick={() => selectActivityType(at.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all',
                    activityType === at.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-gray-300 hover:bg-muted/40'
                  )}
                >
                  <span className="text-xl leading-none">{at.emoji}</span>
                  <span className={cn(
                    'text-[10px] font-medium leading-tight',
                    activityType === at.id ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {at.label}
                  </span>
                  {activityType === at.id && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 — Convention selector (shown once activity type is selected) */}
          {activityType && (
            <div className="space-y-2 pt-1 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-3">
                Étape 2 — Convention collective
              </p>

              {activityType === 'other' ? (
                /* Free text input for "Autre" */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nom de la convention</Label>
                      <Input
                        value={customAgreement}
                        onChange={e => setCustomAgreement(e.target.value)}
                        placeholder="Ex: Convention entreprise interne"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Numéro IDCC (facultatif)</Label>
                      <Input
                        value={settings.collective_agreement === 'Autre' ? '' : settings.collective_agreement}
                        onChange={e => set('collective_agreement', e.target.value || 'Autre')}
                        placeholder="Ex: IDCC 9999"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ) : availableConventions && availableConventions.length > 0 ? (
                /* Radio-style convention list */
                <div className="space-y-1.5">
                  {availableConventions.map(code => {
                    const conv = CONVENTIONS[code]
                    const isSelected = settings.collective_agreement === code
                    return (
                      <button
                        key={code}
                        onClick={() => set('collective_agreement', code)}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-gray-300 hover:bg-muted/30'
                        )}
                      >
                        <div className={cn(
                          'h-4 w-4 rounded-full border-2 shrink-0 transition-colors',
                          isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                        )}>
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white m-auto mt-0.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-medium', isSelected ? 'text-primary' : 'text-foreground')}>
                            {code}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{conv?.label}</p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {/* Convention details panel */}
              {conventionDetails && (
                <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4 mt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                      {conventionDetails.code} — {conventionDetails.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {[
                      { label: 'Durée légale hebdo', value: conventionDetails.weekly_hours },
                      { label: 'Heures sup. dès',    value: conventionDetails.overtime_from },
                      { label: 'Repos quotidien',    value: conventionDetails.rest_hours },
                    ].map(item => (
                      <div key={item.label} className="rounded-md bg-white/80 border border-amber-100 px-3 py-2">
                        <p className="text-[10px] text-amber-700 font-medium uppercase tracking-wide">{item.label}</p>
                        <p className="text-sm font-semibold text-amber-900 mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2">
                    <ChevronRight className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700">{conventionDetails.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

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

      {/* ── Règles de planification ───────────────────────────────────── */}
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

      {/* ── Jours de fermeture ────────────────────────────────────────── */}
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
                  className={cn(
                    'h-9 w-12 rounded-lg border text-sm font-medium transition-colors',
                    closed
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  )}
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

      {/* ── Règles des pauses ─────────────────────────────────────────── */}
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

      {/* ── Paramètres salariaux ──────────────────────────────────────── */}
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

      {/* ── Indemnisation repas ───────────────────────────────────────── */}
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

      {/* ── Couleurs du planning ──────────────────────────────────────── */}
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
