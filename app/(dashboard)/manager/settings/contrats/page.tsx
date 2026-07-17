'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Check, FileText, ShieldCheck, Info, Save, BadgeCheck, FileClock, Sun, Zap } from 'lucide-react'
import {
  CONTRACT_TYPES,
  parseContractConfig,
  defaultContractConfig,
  type ContractType,
  type ContractTypesConfig,
} from '@/lib/contracts'

// Métadonnées d'affichage par type (icône + sous-titre). Le type reste piloté
// par lib/contracts ; ceci n'ajoute que la présentation.
const TYPE_META: Record<ContractType, { icon: typeof FileText; sub: string }> = {
  'CDI 35h':        { icon: BadgeCheck, sub: 'Temps plein · engagement durable' },
  'CDI 28h':        { icon: BadgeCheck, sub: 'Temps partiel · engagement durable' },
  'CDD':            { icon: FileClock,  sub: 'Durée déterminée' },
  'CDD Saisonnier': { icon: Sun,        sub: 'Saison · durée déterminée' },
  'Extra':          { icon: Zap,        sub: 'Renfort ponctuel · à l’heure' },
}

// Règles légales vérifiées automatiquement par le moteur de conformité
// (lib/compliance/rules.ts). Affichées ici en lecture seule.
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
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Loader2 className="ic20 nx-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
  }

  return (
    <div className="nx-planpage" style={{ maxWidth: 672, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-.02em', color: 'var(--text-primary)' }}>Contrats &amp; RH</h1>
        <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)' }}>Types de contrats proposés à vos équipes et repères horaires.</p>
      </div>

      {/* Types de contrats */}
      <div className="nx-card">
        <div className="nx-card-head">
          <div className="nx-ico" style={{ background: 'var(--accent-light)' }}><FileText className="ic16" style={{ color: 'var(--accent)' }} /></div>
          <div><div className="nx-card-title">Types de contrats proposés</div><div className="nx-card-desc">Cochez les contrats que vous utilisez vraiment : eux seuls apparaîtront quand vous ajoutez un employé.</div></div>
        </div>
        <div className="nx-card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CONTRACT_TYPES.map((type, i) => {
              const c = config[type]
              const Icon = TYPE_META[type].icon
              return (
                <div key={type} className={`nx-ctype ${c.enabled ? 'on' : ''}`} style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="nx-ctype-ico"><Icon className="ic18" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{type}</p>
                    <p style={{ fontSize: 11.5, marginTop: 2, color: 'var(--text-tertiary)' }}>{TYPE_META[type].sub}</p>
                  </div>
                  <div style={{ position: 'relative', width: 78, flexShrink: 0 }}>
                    <input
                      className="nx-input" type="number" min="0" max="60" step="0.5"
                      style={{ height: 34, textAlign: 'center', paddingRight: 22 }}
                      value={c.ref_hours === 0 ? '' : c.ref_hours}
                      onChange={e => setRefHours(type, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      placeholder="—"
                      disabled={!c.enabled}
                    />
                    <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-tertiary)' }}>h</span>
                  </div>
                  <button className={`nx-switch ${c.enabled ? 'on' : ''}`} onClick={() => toggle(type)} aria-label={`Proposer ${type}`} style={{ flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingTop: 16, marginTop: 4, borderTop: '0.5px solid var(--border)' }}>
            <Info className="ic14" style={{ color: 'var(--text-tertiary)', marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>h/sem.</span> est le volume horaire hebdomadaire de référence : il pré-remplit le champ « Volume horaire » à la création d’un employé de ce type. Toujours modifiable ensuite dans la fiche.
            </p>
          </div>
          {activeCount === 0 && (
            <p style={{ fontSize: 12, paddingTop: 8, color: 'var(--warning)' }}>
              Aucun type activé — tous les types restent proposés par défaut pour ne pas bloquer la création d’employés.
            </p>
          )}
        </div>
      </div>

      {/* Durées légales */}
      <div className="nx-card">
        <div className="nx-card-head">
          <div className="nx-ico" style={{ background: 'rgba(16,185,129,.12)' }}><ShieldCheck className="ic16" style={{ color: 'var(--emerald)' }} /></div>
          <div><div className="nx-card-title">Durées maximales légales</div><div className="nx-card-desc">On veille dessus pour vous, en direct sur la grille — quelle que soit votre convention.</div></div>
        </div>
        <div className="nx-card-body">
          <div className="nx-legalgrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {LEGAL_RULES.map(rule => (
              <div key={rule.label} className="nx-legal">
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{rule.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{rule.value}</p>
                </div>
                <p style={{ fontSize: 11, lineHeight: 1.45, marginTop: 5, color: 'var(--text-tertiary)' }}>{rule.detail}</p>
                <p style={{ fontSize: 9.5, marginTop: 7, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>Art. {rule.ref}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingTop: 16, marginTop: 4, borderTop: '0.5px solid var(--border)' }}>
            <Info className="ic14" style={{ color: 'var(--text-tertiary)', marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Ces seuils découlent du Code du travail et ne se règlent pas ici. Les durées propres à votre secteur (heures sup., équivalences, repos) se configurent dans{' '}
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Réglages › Planning</span> via votre convention collective.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ minWidth: 140, justifyContent: 'center' }}>
          {saving ? <><Loader2 className="ic14 nx-spin" />Enregistrement…</> : saved ? <><Check className="ic14" />Enregistré !</> : <><Save className="ic14" />Enregistrer</>}
        </button>
      </div>
    </div>
  )
}
