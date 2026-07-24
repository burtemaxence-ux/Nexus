'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Loader2, Check, BookOpen, Cpu, Sparkles, ShieldCheck, Save, Clock, CalendarX,
  SlidersHorizontal, Coffee, Wallet, Utensils, Palette, Info, Pencil, TrendingUp, Moon,
} from 'lucide-react'
import { buildComplianceConfig, defaultAlertsForConvention } from '@/lib/compliance/config'

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
  planning_engine: string
  alert_night_work: string
  alert_sunday_work: string
  alert_part_time_split: string
  alert_hours_avg_weekly: string
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
  planning_engine: 'algorithm',
  alert_night_work: 'on',
  alert_sunday_work: 'on',
  alert_part_time_split: 'on',
  alert_hours_avg_weekly: 'on',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReglesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [closedDays, setClosedDays] = useState<number[]>([])

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
          planning_engine:        (data.planning_engine === 'algorithm' || data.planning_engine === 'ai') ? data.planning_engine : DEFAULTS.planning_engine,
          ...(() => {
            const c = buildComplianceConfig(data)
            return {
              alert_night_work:       c.night_work ? 'on' : 'off',
              alert_sunday_work:      c.sunday_work ? 'on' : 'off',
              alert_part_time_split:  c.part_time_split ? 'on' : 'off',
              alert_hours_avg_weekly: c.hours_avg_weekly ? 'on' : 'off',
            }
          })(),
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

  function chooseConvention(ccn: string) {
    const d = defaultAlertsForConvention(ccn)
    setSettings(prev => ({
      ...prev,
      collective_agreement: ccn,
      alert_night_work: d.night_work ? 'on' : 'off',
      alert_sunday_work: d.sunday_work ? 'on' : 'off',
      alert_part_time_split: d.part_time_split ? 'on' : 'off',
      alert_hours_avg_weekly: d.hours_avg_weekly ? 'on' : 'off',
    }))
  }

  function toggleDay(idx: number) {
    setClosedDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])
  }

  function selectActivityType(id: ActivityTypeId) {
    setActivityType(id)
    const options = ACTIVITY_CONVENTIONS[id]
    if (options.length === 1) chooseConvention(options[0])
    else if (id === 'other') chooseConvention('Autre')
  }

  function toggleBool(key: keyof Settings) {
    set(key, settings[key] === 'true' ? 'false' : 'true')
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
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Loader2 className="ic20 nx-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
  }

  const conventionDetails = settings.collective_agreement !== 'Autre' ? CONVENTIONS[settings.collective_agreement] : null
  const availableConventions = activityType ? ACTIVITY_CONVENTIONS[activityType] : null

  const alertRows = [
    { key: 'alert_night_work' as const, title: 'Travail de nuit', desc: 'Service touchant la plage 21h–6h (ouverture tôt / fermeture tard).' },
    { key: 'alert_sunday_work' as const, title: 'Travail le dimanche', desc: 'Shift planifié un dimanche.' },
    { key: 'alert_part_time_split' as const, title: 'Coupure temps partiel', desc: 'Plus d’une interruption dans la journée pour un temps partiel.' },
    { key: 'alert_hours_avg_weekly' as const, title: 'Moyenne 44h sur 12 semaines', desc: 'Durée hebdomadaire moyenne > 44h sur 12 semaines glissantes.' },
  ]

  const planColors = [
    { key: 'color_shift'    as const, label: 'Shift normal' },
    { key: 'color_absence'  as const, label: 'Absence' },
    { key: 'color_conge'    as const, label: 'Congé' },
    { key: 'color_overtime' as const, label: 'Heures sup.' },
  ]

  return (
    <div className="nx-planpage" style={{ maxWidth: 672, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-.02em', color: 'var(--text-primary)' }}>Planning</h1>
        <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)' }}>Convention, règles de planification, horaires et personnalisation visuelle.</p>
      </div>

      {/* Convention collective */}
      <div className="nx-card">
        <div className="nx-card-head">
          <div className="nx-ico" style={{ background: 'rgba(240,140,0,.12)' }}><BookOpen className="ic16" style={{ color: 'var(--warning)' }} /></div>
          <div><div className="nx-card-title">Convention collective</div><div className="nx-card-desc">On s’appuie dessus pour vérifier repos, heures sup. et primes à votre place — vous n’avez rien à calculer.</div></div>
        </div>
        <div className="nx-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
              <span className="nx-step">1</span>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Type d’activité</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
              {ACTIVITY_TYPES.map((at, i) => (
                <button key={at.id} className={`nx-act ${activityType === at.id ? 'on' : ''}`} onClick={() => selectActivityType(at.id)} style={{ animationDelay: `${i * 0.03}s` }}>
                  <span className="nx-act-check"><Check className="ic10" /></span>
                  <span className="nx-act-emoji">{at.emoji}</span>
                  <span className="nx-act-label">{at.label}</span>
                </button>
              ))}
            </div>
          </div>

          {activityType && (
            <div style={{ paddingTop: 20, borderTop: '0.5px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                <span className="nx-step">2</span>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Convention collective</p>
              </div>

              {activityType === 'other' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="nx-label">Nom de la convention</label>
                    <Input value={customAgreement} onChange={e => setCustomAgreement(e.target.value)} placeholder="Ex : Convention entreprise interne" className="nx-input" style={{ height: 34 }} />
                  </div>
                  <div>
                    <label className="nx-label">Numéro IDCC (facultatif)</label>
                    <Input value={settings.collective_agreement === 'Autre' ? '' : settings.collective_agreement} onChange={e => chooseConvention(e.target.value || 'Autre')} placeholder="Ex : IDCC 9999" className="nx-input" style={{ height: 34 }} />
                  </div>
                </div>
              ) : availableConventions && availableConventions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {availableConventions.map(code => {
                    const conv = CONVENTIONS[code]
                    const sel = settings.collective_agreement === code
                    return (
                      <button key={code} className={`nx-conv ${sel ? 'on' : ''}`} onClick={() => chooseConvention(code)}>
                        <span className="nx-radio-dot">{sel && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{code}</span>
                          <span style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)' }}>{conv?.label}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {conventionDetails && (
                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 14, padding: 16, marginTop: 14, border: '0.5px solid rgba(240,140,0,.28)', background: 'rgba(240,140,0,.07)' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(240,140,0,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><BookOpen className="ic14" style={{ color: 'var(--warning)' }} /></span>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--warning)' }}>{conventionDetails.code} — {conventionDetails.label}</p>
                  </div>
                  <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
                    {[
                      { icon: Clock, label: 'Durée légale hebdo', value: conventionDetails.weekly_hours },
                      { icon: TrendingUp, label: 'Heures sup. dès', value: conventionDetails.overtime_from },
                      { icon: Moon, label: 'Repos quotidien', value: conventionDetails.rest_hours },
                    ].map(m => (
                      <div key={m.label} style={{ borderRadius: 10, padding: '10px 12px', background: 'var(--bg-card)', border: '0.5px solid rgba(240,140,0,.22)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--warning)' }}><m.icon className="ic12" /><p style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{m.label}</p></div>
                        <p style={{ fontSize: 14, fontWeight: 700, marginTop: 5, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 6 }}><Info className="ic14" style={{ color: 'var(--warning)', marginTop: 1, flexShrink: 0 }} /><p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{conventionDetails.notes}</p></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Horaires + Jours de fermeture */}
      <div className="nx-pair">
        <div className="nx-card">
          <div className="nx-card-head"><div className="nx-ico" style={{ background: 'var(--accent-light)' }}><Clock className="ic16" style={{ color: 'var(--accent)' }} /></div><div><div className="nx-card-title">Horaires de l’établissement</div><div className="nx-card-desc">Dites-nous quand vous ouvrez : on s’en sert pour repérer les créneaux qui débordent.</div></div></div>
          <div className="nx-card-body"><div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}><label className="nx-label">Ouverture</label><input className="nx-input" type="time" value={settings.opening_time} onChange={e => set('opening_time', e.target.value)} /></div>
            <div style={{ paddingTop: 22, color: 'var(--text-secondary)' }}>→</div>
            <div style={{ flex: 1 }}><label className="nx-label">Fermeture</label><input className="nx-input" type="time" value={settings.closing_time} onChange={e => set('closing_time', e.target.value)} /></div>
          </div></div>
        </div>
        <div className="nx-card">
          <div className="nx-card-head"><div className="nx-ico" style={{ background: 'rgba(250,82,82,.12)' }}><CalendarX className="ic16" style={{ color: 'var(--danger)' }} /></div><div><div className="nx-card-title">Jours de fermeture</div><div className="nx-card-desc">Cochez vos jours de repos : ils apparaîtront grisés, impossible d’y planifier par erreur.</div></div></div>
          <div className="nx-card-body"><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {WEEK_DAYS.map((day, idx) => (
              <button key={idx} className={`nx-day ${closedDays.includes(idx) ? 'on' : ''}`} onClick={() => toggleDay(idx)}>{day}</button>
            ))}
          </div></div>
        </div>
      </div>

      {/* Règles de planification */}
      <div className="nx-card">
        <div className="nx-card-head"><div className="nx-ico" style={{ background: 'var(--accent-light)' }}><SlidersHorizontal className="ic16" style={{ color: 'var(--accent)' }} /></div><div><div className="nx-card-title">Règles de planification</div><div className="nx-card-desc">Vos garde-fous au moment de poser un créneau, pour éviter les erreurs avant qu’elles arrivent.</div></div></div>
        <div className="nx-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div><label className="nx-label">Durée minimum d’un créneau</label>
              <Select value={settings.min_shift_duration} onValueChange={v => set('min_shift_duration', v)}>
                <SelectTrigger className="nx-input"><SelectValue /></SelectTrigger>
                <SelectContent>{MIN_SHIFT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="nx-label">Durée maximum d’un créneau</label>
              <Select value={settings.max_shift_duration} onValueChange={v => set('max_shift_duration', v)}>
                <SelectTrigger className="nx-input"><SelectValue /></SelectTrigger>
                <SelectContent>{MAX_SHIFT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><label className="nx-label">Repos minimum entre deux shifts</label>
            <Select value={settings.min_rest_hours} onValueChange={v => set('min_rest_hours', v)}>
              <SelectTrigger className="nx-input" style={{ maxWidth: 220 }}><SelectValue /></SelectTrigger>
              <SelectContent>{REST_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="nx-togglerow">
            <div><p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Heures supplémentaires autorisées</p><p style={{ fontSize: 12, marginTop: 2, color: 'var(--text-tertiary)' }}>Si désactivé, une alerte bloquante empêche de planifier au-delà du contrat.</p></div>
            <button className={`nx-switch ${settings.overtime_allowed === 'true' ? 'on' : ''}`} onClick={() => toggleBool('overtime_allowed')} aria-label="Heures supplémentaires autorisées" />
          </div>
        </div>
      </div>

      {/* Pauses */}
      <div className="nx-card">
        <div className="nx-card-head"><div className="nx-ico" style={{ background: 'rgba(0,169,143,.12)' }}><Coffee className="ic16" style={{ color: 'var(--emerald)' }} /></div><div><div className="nx-card-title">Règles des pauses</div><div className="nx-card-desc">À partir de quand une pause devient obligatoire. La loi dit 6 h — à vous d’ajuster si votre convention est plus généreuse.</div></div></div>
        <div className="nx-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><label className="nx-label">Durée de travail avant déclenchement d’une pause</label>
            <Select value={settings.break_trigger_minutes} onValueChange={v => set('break_trigger_minutes', v)}>
              <SelectTrigger className="nx-input" style={{ maxWidth: 200 }}><SelectValue /></SelectTrigger>
              <SelectContent>{BREAK_TRIGGER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="nx-togglerow">
            <div><p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Rémunération des pauses</p><p style={{ fontSize: 12, marginTop: 2, color: 'var(--text-tertiary)' }}>Si activé, les temps de pause sont comptabilisés dans les heures payées.</p></div>
            <button className={`nx-switch ${settings.paid_breaks === 'true' ? 'on' : ''}`} onClick={() => toggleBool('paid_breaks')} aria-label="Rémunération des pauses" />
          </div>
        </div>
      </div>

      {/* Paramètres salariaux */}
      <div className="nx-card">
        <div className="nx-card-head"><div className="nx-ico" style={{ background: 'rgba(0,169,143,.12)' }}><Wallet className="ic16" style={{ color: 'var(--emerald)' }} /></div><div><div className="nx-card-title">Paramètres salariaux</div><div className="nx-card-desc">Ce qu’il nous faut pour estimer vos coûts au plus juste dans les rapports.</div></div></div>
        <div className="nx-card-body"><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div><label className="nx-label">Taux de charges patronales (%)</label><div style={{ position: 'relative' }}><input className="nx-input" type="number" min="0" max="100" step="0.5" value={settings.employer_charges_rate} onChange={e => set('employer_charges_rate', e.target.value)} style={{ paddingRight: 28 }} /><span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-tertiary)' }}>%</span></div></div>
          <div><label className="nx-label">Jours travaillés de référence</label><div style={{ position: 'relative' }}><input className="nx-input" type="number" min="1" max="7" step="1" value={settings.reference_work_days} onChange={e => set('reference_work_days', e.target.value)} style={{ paddingRight: 52 }} /><span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-tertiary)' }}>j/sem.</span></div></div>
        </div></div>
      </div>

      {/* Indemnisation repas */}
      <div className="nx-card">
        <div className="nx-card-head"><div className="nx-ico" style={{ background: 'rgba(0,169,143,.12)' }}><Utensils className="ic16" style={{ color: 'var(--emerald)' }} /></div><div><div className="nx-card-title">Indemnisation des repas</div><div className="nx-card-desc">Un repas dû dès qu’un service dépasse 5 h ? On l’ajoute tout seul à vos coûts.</div></div></div>
        <div className="nx-card-body"><div className="nx-togglerow">
          <div><p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Activer l’indemnisation des repas</p><p style={{ fontSize: 12, marginTop: 2, color: 'var(--text-tertiary)' }}>Selon la convention, un repas est dû pour tout shift de plus de 5h.</p></div>
          <button className={`nx-switch ${settings.meal_allowance_enabled === 'true' ? 'on' : ''}`} onClick={() => toggleBool('meal_allowance_enabled')} aria-label="Indemnisation des repas" />
        </div></div>
      </div>

      {/* Alertes de conformité */}
      <div className="nx-card">
        <div className="nx-card-head"><div className="nx-ico" style={{ background: 'rgba(240,140,0,.12)' }}><ShieldCheck className="ic16" style={{ color: 'var(--warning)' }} /></div><div><div className="nx-card-title">Alertes de conformité</div><div className="nx-card-desc">Ces situations sont parfaitement légales, mais bonnes à garder à l’œil. Coupez celles que votre convention gère déjà — les plafonds obligatoires (repos 11 h, 10 h/jour, 48 h, mineurs…) restent vérifiés quoi qu’il arrive.</div></div></div>
        <div className="nx-card-body">
          {alertRows.map(a => (
            <div key={a.key} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '10px 0' }}>
              <div style={{ minWidth: 0 }}><p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{a.title}</p><p style={{ fontSize: 12, marginTop: 2, color: 'var(--text-tertiary)' }}>{a.desc}</p></div>
              <button className={`nx-switch ${settings[a.key] === 'on' ? 'on' : ''}`} onClick={() => set(a.key, settings[a.key] === 'on' ? 'off' : 'on')} aria-label={a.title} />
            </div>
          ))}
        </div>
      </div>

      {/* Génération */}
      <div className="nx-card">
        <div className="nx-card-head"><div className="nx-ico" style={{ background: 'var(--accent-light)' }}><Cpu className="ic16" style={{ color: 'var(--accent)' }} /></div><div><div className="nx-card-title">Génération automatique du planning</div><div className="nx-card-desc">Comment Quartzbase construit votre planning quand vous cliquez sur « Générer ».</div></div></div>
        <div className="nx-card-body"><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([
            { value: 'algorithm', icon: Cpu, title: 'Algorithme déterministe (recommandé)', desc: 'Le solveur place les shifts en suivant des règles claires : repos 11h, max 10h/jour, heures contractuelles, prévision de CA. Instantané, gratuit, sans erreur de conformité, tous les jours couverts.' },
            { value: 'ai', icon: Sparkles, title: 'Assistant IA', desc: 'Le modèle propose un planning à partir de votre contexte libre (note, demandes spécifiques). Plus créatif mais plus lent, peut hésiter et consomme du quota.' },
          ] as const).map(opt => {
            const sel = settings.planning_engine === opt.value
            const Icon = opt.icon
            return (
              <button key={opt.value} className={`nx-radio ${sel ? 'on' : ''}`} onClick={() => set('planning_engine', opt.value)}>
                <span className="nx-radio-dot" style={{ marginTop: 2 }}>{sel && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}</span>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}><Icon className="ic18" style={{ color: 'var(--accent)' }} /></span>
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{opt.title}</span><span style={{ display: 'block', fontSize: 12, marginTop: 2, color: 'var(--text-tertiary)' }}>{opt.desc}</span></span>
              </button>
            )
          })}
        </div></div>
      </div>

      {/* Couleurs */}
      <div className="nx-card">
        <div className="nx-card-head"><div className="nx-ico" style={{ background: 'var(--accent-light)' }}><Palette className="ic16" style={{ color: 'var(--accent)' }} /></div><div><div className="nx-card-title">Couleurs du planning</div><div className="nx-card-desc">Donnez à votre grille les couleurs qui vous parlent.</div></div></div>
        <div className="nx-card-body"><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {planColors.map(({ key, label }) => (
            <label key={key} className="nx-swatch" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, border: '0.5px solid var(--border)', background: 'var(--bg-page)', cursor: 'pointer' }}>
              <span className="nx-swatch-chip" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.12)', background: settings[key], position: 'relative' }}>
                <input type="color" value={settings[key]} onChange={e => set(key, e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p><p className="nx-mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{settings[key]}</p></div>
              <Pencil className="ic14" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            </label>
          ))}
        </div></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ minWidth: 140, justifyContent: 'center' }}>
          {saving ? <><Loader2 className="ic14 nx-spin" />Enregistrement…</> : saved ? <><Check className="ic14" />Enregistré !</> : <><Save className="ic14" />Enregistrer</>}
        </button>
      </div>
    </div>
  )
}
