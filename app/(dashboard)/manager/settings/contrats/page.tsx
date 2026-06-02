'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Check, FileText } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type ContractConfig = {
  enabled: boolean
  max_hours_week: number    // 0 = pas de limite
  alert_hours_week: number  // 0 = pas d'alerte
  alert_complementary: boolean
}

type ContractTypes = {
  'CDI 35h': ContractConfig
  'CDI temps partiel': ContractConfig
  'CDD': ContractConfig
  'CDD Saisonnier': ContractConfig
  'Extra': ContractConfig
  'Apprentissage': ContractConfig
  'Stage': ContractConfig
}

const CONTRACT_KEYS = [
  'CDI 35h',
  'CDI temps partiel',
  'CDD',
  'CDD Saisonnier',
  'Extra',
  'Apprentissage',
  'Stage',
] as const

type ContractKey = (typeof CONTRACT_KEYS)[number]

const DEFAULTS: ContractTypes = {
  'CDI 35h':          { enabled: true,  max_hours_week: 0,  alert_hours_week: 37, alert_complementary: false },
  'CDI temps partiel':{ enabled: true,  max_hours_week: 0,  alert_hours_week: 0,  alert_complementary: true  },
  'CDD':              { enabled: true,  max_hours_week: 0,  alert_hours_week: 0,  alert_complementary: false },
  'CDD Saisonnier':   { enabled: true,  max_hours_week: 0,  alert_hours_week: 0,  alert_complementary: false },
  'Extra':            { enabled: true,  max_hours_week: 0,  alert_hours_week: 0,  alert_complementary: true  },
  'Apprentissage':    { enabled: true,  max_hours_week: 28, alert_hours_week: 0,  alert_complementary: false },
  'Stage':            { enabled: true,  max_hours_week: 0,  alert_hours_week: 0,  alert_complementary: false },
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
      className={`relative inline-flex ${h} items-center rounded-full transition-colors duration-150 focus:outline-none`}
      style={{ backgroundColor: checked ? 'var(--accent)' : 'var(--border)' }}
    >
      <span className={`inline-block ${dot} transform rounded-full bg-white shadow transition-transform ${
        checked ? on : 'translate-x-1'
      }`} />
    </button>
  )
}

function NumInput({
  value, onChange, placeholder,
}: { value: number; onChange: (v: number) => void; placeholder: string }) {
  return (
    <div className="relative w-20">
      <Input
        type="number"
        min="0"
        step="0.5"
        value={value === 0 ? '' : value}
        onChange={e => onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
        placeholder={placeholder}
        className="h-7 text-sm pr-5 text-center"
      />
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">h</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ContratsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [config, setConfig] = useState<ContractTypes>(DEFAULTS)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        if (data.contract_types_config) {
          try {
            const parsed = JSON.parse(data.contract_types_config) as Partial<ContractTypes>
            setConfig(prev => {
              const merged = { ...prev }
              for (const key of CONTRACT_KEYS) {
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

  function setField<K extends keyof ContractConfig>(
    type: ContractKey, field: K, value: ContractConfig[K]
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
      body: JSON.stringify({ contract_types_config: JSON.stringify(config) }),
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

  const enabledKeys = CONTRACT_KEYS.filter(k => config[k].enabled)

  return (
    <div className="max-w-2xl mx-auto px-8 py-10 space-y-6">
      <div>
        <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>Contrats & RH</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Types de contrats actifs et limites automatiques par type.
        </p>
      </div>

      {/* ── Types de contrats actifs ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <CardTitle className="text-base">Types de contrats disponibles</CardTitle>
              <CardDescription>
                Activez les types proposés lors de la création d&apos;un employé.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-0 divide-y divide-border">
            {CONTRACT_KEYS.map(key => (
              <div key={key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${config[key].enabled ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-[#2A2D3A]'}`} />
                  <span className={`text-sm font-medium ${config[key].enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {key}
                  </span>
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

      {/* ── Limites automatiques ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Limites et alertes par type</CardTitle>
          <CardDescription>
            Configurez les seuils d&apos;alerte et les maximums légaux par contrat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enabledKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun type de contrat activé.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide pr-4">Type</th>
                  <th className="text-center py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide px-3">
                    Max h/sem
                  </th>
                  <th className="text-center py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide px-3">
                    Alerte h/sem
                  </th>
                  <th className="text-center py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide pl-3">
                    H. comp.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {enabledKeys.map(key => (
                  <tr key={key} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="font-medium text-foreground">{key}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <NumInput
                        value={config[key].max_hours_week}
                        onChange={v => setField(key, 'max_hours_week', v)}
                        placeholder="—"
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <NumInput
                        value={config[key].alert_hours_week}
                        onChange={v => setField(key, 'alert_hours_week', v)}
                        placeholder="—"
                      />
                    </td>
                    <td className="py-3 pl-3 text-center">
                      <Toggle
                        checked={config[key].alert_complementary}
                        onToggle={() => setField(key, 'alert_complementary', !config[key].alert_complementary)}
                        small
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-4 pt-4 border-t border-border space-y-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Max h/sem</span> — bloque la planification au-delà de ce seuil.
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Alerte h/sem</span> — déclenche une alerte sans bloquer (ex : 37h pour CDI 35h).
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">H. comp.</span> — alerte si les heures planifiées dépassent 1/3 du contrat (temps partiels, extras).
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
