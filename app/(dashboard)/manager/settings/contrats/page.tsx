'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Check, FileText, ShieldCheck, Info } from 'lucide-react'
import {
  CONTRACT_TYPES,
  parseContractConfig,
  defaultContractConfig,
  type ContractType,
  type ContractTypesConfig,
} from '@/lib/contracts'

// Règles légales vérifiées automatiquement par le moteur de conformité
// (lib/compliance/rules.ts). Affichées ici en lecture seule : elles s'appliquent
// quelle que soit la convention collective.
const LEGAL_RULES = [
  { label: 'Repos quotidien',     value: '11h min.', detail: 'Entre la fin d’un service et le début du suivant.',          ref: 'L3131-1'  },
  { label: 'Repos hebdomadaire',  value: '35h min.', detail: 'Repos continu (24h + 11h) sur chaque fenêtre de 7 jours.',   ref: 'L3132-2'  },
  { label: 'Durée max / jour',    value: '10h',      detail: 'Travail effectif sur une même journée.',                     ref: 'L3121-18' },
  { label: 'Durée max / semaine', value: '48h',      detail: 'Maximum absolu, heures supplémentaires comprises.',          ref: 'L3121-20' },
  { label: 'Moyenne / 12 sem.',   value: '44h max.', detail: 'Moyenne hebdomadaire sur 12 semaines glissantes.',           ref: 'L3121-22' },
  { label: 'Amplitude / jour',    value: '13h max.', detail: 'Entre le début et la fin de la journée (split shifts inclus).', ref: 'L3121-1' },
  { label: 'Pause obligatoire',   value: '20 min',   detail: 'Dès 6h de travail consécutives.',                            ref: 'L3121-16' },
  { label: 'Jours consécutifs',   value: '6 max.',   detail: 'Un jour de repos hebdomadaire reste obligatoire.',           ref: 'L3132-1'  },
  { label: 'Mineur — durée',      value: '8h / 35h', detail: 'Durée quotidienne et hebdomadaire max pour un apprenti mineur.', ref: 'L3162-1' },
  { label: 'Mineur — nuit',       value: 'interdit', detail: 'Travail interdit 22h–6h (20h–6h avant 16 ans).',             ref: 'L3163-1'  },
  { label: 'Mineur — repos',      value: '12h / 14h', detail: 'Repos quotidien renforcé (14h avant 16 ans).',              ref: 'L3164-1'  },
  { label: 'Mineur — pause',      value: '30 min',   detail: 'Dès 4h30 de travail continu.',                               ref: 'L3162-3'  },
  { label: 'Temps partiel',       value: '1 coupure', detail: 'Au plus une interruption par jour (spécificités CCN HCR).', ref: 'L3123-23' },
  { label: 'Heures contractuelles', value: 'suivi',  detail: 'Alerte si les heures planifiées dépassent le contrat.',      ref: 'Contrat'  },
] as const

// ── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150 focus:outline-none"
      style={{ backgroundColor: checked ? 'var(--accent)' : 'var(--border)' }}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ContratsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [config, setConfig] = useState<ContractTypesConfig>(defaultContractConfig())

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        setConfig(parseContractConfig(data.contract_types_config))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function toggle(type: ContractType) {
    setConfig(prev => ({ ...prev, [type]: { ...prev[type], enabled: !prev[type].enabled } }))
  }
  function setRefHours(type: ContractType, hours: number) {
    setConfig(prev => ({ ...prev, [type]: { ...prev[type], ref_hours: hours } }))
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_types_config: JSON.stringify(config) }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const activeCount = useMemo(() => CONTRACT_TYPES.filter(t => config[t].enabled).length, [config])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-10 space-y-6">
      <div>
        <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>Contrats & RH</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Choisissez les types de contrats proposés à vos équipes et leurs repères horaires.
        </p>
      </div>

      {/* ── Types de contrats proposés ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <CardTitle className="text-base">Types de contrats proposés</CardTitle>
              <CardDescription>
                Les types activés apparaissent dans le menu déroulant à la création et à l’édition d’un employé.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* En-têtes de colonnes */}
          <div className="grid grid-cols-[1fr_5rem_3rem] items-center gap-x-4 pb-2 border-b border-border">
            <span className="text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>Type</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-center" style={{ color: 'var(--text-tertiary)' }}>h/sem.</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-right" style={{ color: 'var(--text-tertiary)' }}>Proposé</span>
          </div>

          <div className="divide-y divide-border/60">
            {CONTRACT_TYPES.map(type => {
              const c = config[type]
              return (
                <div key={type} className="grid grid-cols-[1fr_5rem_3rem] items-center gap-x-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${c.enabled ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-[#2A2D3A]'}`} />
                    <span className={`text-sm font-medium truncate ${c.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>{type}</span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number" min="0" max="60" step="0.5"
                      value={c.ref_hours === 0 ? '' : c.ref_hours}
                      onChange={e => setRefHours(type, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      placeholder="—"
                      disabled={!c.enabled}
                      className="h-8 text-sm text-center pr-5"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">h</span>
                  </div>
                  <div className="flex justify-end">
                    <Toggle checked={c.enabled} onToggle={() => toggle(type)} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-start gap-2 pt-4 mt-1 border-t border-border">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">h/sem.</span> est le volume horaire hebdomadaire de référence : il pré-remplit le champ « Volume horaire » à la création d’un employé de ce type. Toujours modifiable ensuite dans la fiche.
            </p>
          </div>

          {activeCount === 0 && (
            <p className="text-xs pt-2" style={{ color: 'var(--warning)' }}>
              Aucun type activé — tous les types restent proposés par défaut pour ne pas bloquer la création d’employés.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Durées maximales légales (lecture seule) ──────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Durées maximales légales</CardTitle>
              <CardDescription>
                Vérifiées automatiquement sur la grille de planning, quelle que soit la convention.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/60">
            {LEGAL_RULES.map(rule => (
              <div key={rule.label} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{rule.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{rule.detail}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground tabular-nums">{rule.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Art. {rule.ref}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 pt-4 mt-1 border-t border-border">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Ces seuils découlent du Code du travail et ne se règlent pas ici. Les durées propres à votre secteur (heures sup., équivalences, repos) se configurent dans{' '}
              <span className="font-medium text-foreground">Réglages › Planning</span> via votre convention collective.
            </p>
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
