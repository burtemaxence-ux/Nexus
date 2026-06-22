'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Check, Umbrella, CheckCircle2, Info } from 'lucide-react'
import {
  LEAVE_TYPES,
  LEAVE_TYPE_CODES,
  parseLeaveConfig,
  defaultLeaveConfig,
  type LeaveType,
  type LeaveTypeSetting,
  type LeaveTypesConfig,
} from '@/lib/leaves'

// ── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ checked, onToggle, small }: { checked: boolean; onToggle: () => void; small?: boolean }) {
  const h = small ? 'h-5 w-9' : 'h-6 w-11'
  const dot = small ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const on = small ? 'translate-x-4' : 'translate-x-6'
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`relative inline-flex ${h} items-center rounded-full transition-colors duration-150 focus:outline-none`}
      style={{ backgroundColor: checked ? 'var(--accent)' : 'var(--border)' }}
    >
      <span className={`inline-block ${dot} transform rounded-full bg-white shadow transition-transform ${
        checked ? on : 'translate-x-1'
      }`} />
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
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
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-10 space-y-6">
      <div>
        <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>Congés & absences</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Types de congés proposés aux équipes et règle de validation de chaque type.
        </p>
      </div>

      {/* ── Types de congés ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
              <Umbrella className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <CardTitle className="text-base">Types de congés proposés</CardTitle>
              <CardDescription>
                Les types activés apparaissent dans le formulaire de demande de l’employé.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {LEAVE_TYPES.map(({ code, label, description }) => (
              <div key={code} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${config[code].enabled ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-[#2A2D3A]'}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${config[code].enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {label}
                    </p>
                    <p className="text-xs text-muted-foreground/70 truncate">{description}</p>
                  </div>
                </div>
                <Toggle
                  checked={config[code].enabled}
                  onToggle={() => setField(code, 'enabled', !config[code].enabled)}
                  small
                />
              </div>
            ))}
          </div>
          {enabledCodes.length === 0 && (
            <p className="text-xs pt-3" style={{ color: 'var(--warning)' }}>
              Aucun type activé — tous les types restent proposés par défaut pour ne pas bloquer les demandes.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Workflow & délais ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Validation & délais de prévenance</CardTitle>
              <CardDescription>
                Comment chaque type de demande est traité une fois envoyé par l’employé.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {enabledCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Activez au moins un type de congé ci-dessus.
            </p>
          ) : (
            <>
              {/* En-têtes */}
              <div className="grid grid-cols-[1fr_140px_96px] gap-2 pb-2 border-b border-border">
                <span className="text-[10px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>Type</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-center" style={{ color: 'var(--text-tertiary)' }}>Validation</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-center" style={{ color: 'var(--text-tertiary)' }}>Délai</span>
              </div>

              <div className="divide-y divide-border/60">
                {LEAVE_TYPES.filter(({ code }) => config[code].enabled).map(({ code, label }) => (
                  <div key={code} className="grid grid-cols-[1fr_140px_96px] gap-2 items-center py-3">
                    <span className="text-sm font-medium text-foreground truncate">{label}</span>

                    {/* Validation auto / manager */}
                    <div className="flex items-center justify-center">
                      <div className="flex overflow-hidden" style={{ border: '0.5px solid var(--border)', borderRadius: '6px' }}>
                        {(['auto', 'manager'] as const).map((mode, i) => (
                          <button
                            key={mode}
                            onClick={() => setField(code, 'validation', mode)}
                            className="px-3 py-1.5 text-[12px] font-medium transition-colors duration-150"
                            style={{
                              borderLeft: i === 1 ? '0.5px solid var(--border)' : undefined,
                              backgroundColor: config[code].validation === mode ? 'var(--text-primary)' : 'transparent',
                              color: config[code].validation === mode ? 'var(--bg-card)' : 'var(--text-tertiary)',
                            }}
                          >
                            {mode === 'auto' ? 'Auto' : 'Manager'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Délai de prévenance */}
                    <div className="flex justify-center">
                      <div className="relative w-20">
                        <Input
                          type="number" min="0" step="1"
                          value={config[code].notice_days === 0 ? '' : config[code].notice_days}
                          onChange={e => setField(code, 'notice_days', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                          placeholder="0"
                          className="h-7 text-sm text-center pr-5"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">j</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-4 pt-4 border-t border-border space-y-1.5">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Auto</span> — la demande est approuvée immédiatement et les créneaux planifiés sur la période sont libérés.
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Manager</span> — la demande reste en attente jusqu’à votre validation dans l’onglet Congés.
            </p>
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                <span className="font-medium text-foreground">Délai</span> — affiché à l’employé à titre indicatif lors de sa demande. Non bloquant (un arrêt maladie reste toujours possible).
              </span>
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
