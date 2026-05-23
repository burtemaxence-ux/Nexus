'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Check, Umbrella } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type LeaveConfig = {
  enabled: boolean
  validation: 'auto' | 'manager'
  notice_days: number
}

type LeaveTypes = {
  'Congés payés': LeaveConfig
  'RTT': LeaveConfig
  'Maladie': LeaveConfig
  'Sans solde': LeaveConfig
  'Congé exceptionnel': LeaveConfig
}

const LEAVE_KEYS = [
  'Congés payés',
  'RTT',
  'Maladie',
  'Sans solde',
  'Congé exceptionnel',
] as const

type LeaveKey = (typeof LEAVE_KEYS)[number]

const DEFAULTS: LeaveTypes = {
  'Congés payés':      { enabled: true,  validation: 'manager', notice_days: 14 },
  'RTT':               { enabled: true,  validation: 'manager', notice_days: 7  },
  'Maladie':           { enabled: true,  validation: 'auto',    notice_days: 0  },
  'Sans solde':        { enabled: true,  validation: 'manager', notice_days: 7  },
  'Congé exceptionnel':{ enabled: true,  validation: 'manager', notice_days: 1  },
}

const LEAVE_DESCRIPTIONS: Record<LeaveKey, string> = {
  'Congés payés':       'Congés annuels légaux',
  'RTT':                'Réduction du temps de travail',
  'Maladie':            'Arrêt maladie, justificatif requis',
  'Sans solde':         'Absence non rémunérée',
  'Congé exceptionnel': 'Mariage, décès, naissance…',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onToggle, small }: { checked: boolean; onToggle: () => void; small?: boolean }) {
  const h = small ? 'h-5 w-9' : 'h-6 w-11'
  const dot = small ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const on = small ? 'translate-x-4' : 'translate-x-6'
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`relative inline-flex ${h} items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
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
  const [config, setConfig] = useState<LeaveTypes>(DEFAULTS)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        if (data.leave_types_config) {
          try {
            const parsed = JSON.parse(data.leave_types_config) as Partial<LeaveTypes>
            setConfig(prev => {
              const merged = { ...prev }
              for (const key of LEAVE_KEYS) {
                if (parsed[key]) merged[key] = { ...prev[key], ...parsed[key] }
              }
              return merged
            })
          } catch { /* keep defaults */ }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function setField<K extends keyof LeaveConfig>(
    type: LeaveKey, field: K, value: LeaveConfig[K]
  ) {
    setConfig(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }))
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
        <h1 className="text-xl font-semibold text-gray-900">Congés & absences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Types de congés, workflow de validation et délais de prévenance.
        </p>
      </div>

      {/* ── Types de congés ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <Umbrella className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Types de congés</CardTitle>
              <CardDescription>
                Activez les types proposés aux employés lors d&apos;une demande.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {LEAVE_KEYS.map(key => (
              <div key={key} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${config[key].enabled ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                  <div>
                    <p className={`text-sm font-medium ${config[key].enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {key}
                    </p>
                    <p className="text-xs text-muted-foreground/70">{LEAVE_DESCRIPTIONS[key]}</p>
                  </div>
                </div>
                <Toggle
                  checked={config[key].enabled}
                  onToggle={() => setField(key, 'enabled', !config[key].enabled)}
                  small
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Workflow & délais ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow & délais de prévenance</CardTitle>
          <CardDescription>
            Définissez la validation requise et le délai minimum par type de congé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_110px] gap-2 pb-2 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Validation</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Délai (jours)</span>
          </div>

          <div className="divide-y divide-border/60">
            {LEAVE_KEYS.filter(k => config[k].enabled).map(key => (
              <div key={key} className="grid grid-cols-[1fr_140px_110px] gap-2 items-center py-3">
                {/* Label */}
                <span className="text-sm font-medium text-foreground">{key}</span>

                {/* Validation toggle */}
                <div className="flex items-center justify-center">
                  <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                    <button
                      onClick={() => setField(key, 'validation', 'auto')}
                      className={`px-3 py-1.5 font-medium transition-colors ${
                        config[key].validation === 'auto'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Auto
                    </button>
                    <button
                      onClick={() => setField(key, 'validation', 'manager')}
                      className={`px-3 py-1.5 font-medium transition-colors border-l border-border ${
                        config[key].validation === 'manager'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Manager
                    </button>
                  </div>
                </div>

                {/* Notice days */}
                <div className="flex justify-center">
                  <div className="relative w-20">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={config[key].notice_days === 0 ? '' : config[key].notice_days}
                      onChange={e => setField(key, 'notice_days', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                      placeholder="0"
                      className="h-7 text-sm text-center pr-5"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">j</span>
                  </div>
                </div>
              </div>
            ))}

            {LEAVE_KEYS.filter(k => config[k].enabled).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucun type de congé activé.
              </p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Auto</span> — la demande est approuvée immédiatement sans intervention.
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Manager</span> — la demande reste en attente jusqu&apos;à validation manuelle.
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Délai</span> — nombre de jours minimum entre la demande et la date de début du congé.
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
