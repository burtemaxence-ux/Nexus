'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Check, Umbrella, CheckCircle2, Info, Save, Clock, Stethoscope, Wallet, Sparkles, Zap, UserCheck } from 'lucide-react'
import {
  LEAVE_TYPES,
  LEAVE_TYPE_CODES,
  parseLeaveConfig,
  defaultLeaveConfig,
  type LeaveType,
  type LeaveTypeSetting,
  type LeaveTypesConfig,
} from '@/lib/leaves'

// Métadonnées d'affichage par code (couleur + icône).
const LEAVE_META: Record<LeaveType, { icon: typeof Umbrella; color: string }> = {
  CP:         { icon: Umbrella,    color: '#6C63FF' },
  RTT:        { icon: Clock,       color: '#00A98F' },
  maladie:    { icon: Stethoscope, color: '#fa5252' },
  sans_solde: { icon: Wallet,      color: '#f08c00' },
  autre:      { icon: Sparkles,    color: '#12b886' },
}

export default function CongesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [config, setConfig] = useState<LeaveTypesConfig>(defaultLeaveConfig())

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        setConfig(parseLeaveConfig(data.leave_types_config))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function setField<K extends keyof LeaveTypeSetting>(code: LeaveType, field: K, value: LeaveTypeSetting[K]) {
    setConfig(prev => ({ ...prev, [code]: { ...prev[code], [field]: value } }))
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leave_types_config: JSON.stringify(config) }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const enabledCodes = useMemo(() => LEAVE_TYPE_CODES.filter(c => config[c].enabled), [config])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Loader2 className="ic20 nx-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
  }

  return (
    <div className="nx-planpage" style={{ maxWidth: 672, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-.02em', color: 'var(--text-primary)' }}>Congés &amp; absences</h1>
        <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)' }}>Types de congés proposés et règle de validation de chacun.</p>
      </div>

      {/* Types de congés */}
      <div className="nx-card">
        <div className="nx-card-head">
          <div className="nx-ico" style={{ background: 'var(--accent-light)' }}><Umbrella className="ic16" style={{ color: 'var(--accent)' }} /></div>
          <div><div className="nx-card-title">Types de congés proposés</div><div className="nx-card-desc">Cochez ce que vos équipes peuvent demander : eux seuls apparaîtront dans le formulaire de demande.</div></div>
        </div>
        <div className="nx-card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {LEAVE_TYPES.map(({ code, label, description }, i) => {
              const meta = LEAVE_META[code]
              const Icon = meta.icon
              const enabled = config[code].enabled
              return (
                <div key={code} className={`nx-leave ${enabled ? 'on' : ''}`} style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="nx-leave-ico" style={{ background: `${meta.color}1a` }}><Icon className="ic20" style={{ color: meta.color }} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
                    <p style={{ fontSize: 11.5, marginTop: 2, color: 'var(--text-tertiary)' }}>{description}</p>
                  </div>
                  <button className={`nx-switch ${enabled ? 'on' : ''}`} onClick={() => setField(code, 'enabled', !enabled)} aria-label={`Proposer ${label}`} style={{ flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
          {enabledCodes.length === 0 && (
            <p style={{ fontSize: 12, paddingTop: 12, color: 'var(--warning)' }}>
              Aucun type activé — tous les types restent proposés par défaut pour ne pas bloquer les demandes.
            </p>
          )}
        </div>
      </div>

      {/* Validation & délais */}
      <div className="nx-card">
        <div className="nx-card-head">
          <div className="nx-ico" style={{ background: 'rgba(16,185,129,.12)' }}><CheckCircle2 className="ic16" style={{ color: 'var(--emerald)' }} /></div>
          <div><div className="nx-card-title">Validation &amp; délais de prévenance</div><div className="nx-card-desc">Ce qui se passe une fois qu’un employé envoie sa demande.</div></div>
        </div>
        <div className="nx-card-body">
          {enabledCodes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {LEAVE_TYPES.filter(({ code }) => config[code].enabled).map(({ code, label }) => {
                const meta = LEAVE_META[code]
                const Icon = meta.icon
                return (
                  <div key={code} className="nx-valrow">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${meta.color}1a` }}><Icon className="ic14" style={{ color: meta.color }} /></span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                    </div>
                    <div className="nx-seg-wrap" style={{ justifySelf: 'stretch' }}>
                      <button className={`nx-seg ${config[code].validation === 'auto' ? 'on' : ''}`} onClick={() => setField(code, 'validation', 'auto')} style={{ flex: 1 }}>Auto</button>
                      <button className={`nx-seg ${config[code].validation === 'manager' ? 'on' : ''}`} onClick={() => setField(code, 'validation', 'manager')} style={{ flex: 1 }}>Manager</button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input className="nx-input" type="number" min="0" step="1" style={{ height: 32, textAlign: 'center', paddingRight: 20 }}
                        value={config[code].notice_days === 0 ? '' : config[code].notice_days}
                        onChange={e => setField(code, 'notice_days', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                        placeholder="0"
                      />
                      <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-tertiary)' }}>j</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'var(--bg-page)', border: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, display: 'flex', gap: 8, alignItems: 'flex-start' }}><Zap className="ic14" style={{ color: 'var(--emerald)', marginTop: 1, flexShrink: 0 }} /><span><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Auto</span> — approuvée sur-le-champ, les créneaux planifiés sont libérés automatiquement.</span></p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, display: 'flex', gap: 8, alignItems: 'flex-start' }}><UserCheck className="ic14" style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} /><span><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Manager</span> — en attente jusqu’à votre validation dans l’onglet Congés.</span></p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, display: 'flex', gap: 8, alignItems: 'flex-start' }}><Info className="ic14" style={{ color: 'var(--text-tertiary)', marginTop: 1, flexShrink: 0 }} /><span><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Délai</span> — indicatif pour l’employé, jamais bloquant (un arrêt maladie reste toujours possible).</span></p>
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
