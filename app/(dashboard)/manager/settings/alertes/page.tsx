'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2, Check, BellDot, Lock } from 'lucide-react'

type AlertConfig = { enabled: boolean; blocking: boolean }
type AlertSettings = Record<string, AlertConfig>

interface AlertDef {
  id: string
  label: string
  description: string
  defaultEnabled: boolean
  defaultBlocking: boolean
}

const ALERTS: AlertDef[] = [
  {
    id: 'conflit_horaires',
    label: 'Conflit d\'horaires',
    description: 'Deux shifts se chevauchent pour le même employé sur la même journée.',
    defaultEnabled: true,
    defaultBlocking: true,
  },
  {
    id: 'repos_journalier',
    label: 'Repos journalier insuffisant',
    description: 'Minimum 11h de repos entre la fin d\'un shift et le début du suivant (légal).',
    defaultEnabled: true,
    defaultBlocking: true,
  },
  {
    id: 'repos_hebdomadaire',
    label: 'Repos hebdomadaire insuffisant',
    description: 'Minimum 35h de repos continu par semaine (légal).',
    defaultEnabled: true,
    defaultBlocking: true,
  },
  {
    id: 'volume_journalier_max',
    label: 'Durée journalière maximale dépassée',
    description: 'Un shift dépasse 10h de travail effectif (plafond légal).',
    defaultEnabled: true,
    defaultBlocking: true,
  },
  {
    id: 'pause_obligatoire',
    label: 'Pause obligatoire manquante',
    description: 'Un salarié travaille plus de 6h sans avoir de pause de 20 min minimum planifiée.',
    defaultEnabled: true,
    defaultBlocking: false,
  },
  {
    id: 'amplitude',
    label: 'Amplitude horaire excessive (temps partiels)',
    description: 'Plus de 12h entre le début et la fin de journée d\'un salarié à temps partiel.',
    defaultEnabled: true,
    defaultBlocking: false,
  },
  {
    id: 'jours_consecutifs',
    label: 'Jours consécutifs trop nombreux',
    description: 'Un salarié travaille plus de 6 jours d\'affilée sans repos (légal).',
    defaultEnabled: true,
    defaultBlocking: true,
  },
  {
    id: 'heures_complementaires',
    label: 'Dépassement des heures complémentaires',
    description: 'Les heures planifiées dépassent 33,33 % du volume horaire contractuel (limite légale pour les temps partiels).',
    defaultEnabled: true,
    defaultBlocking: false,
  },
  {
    id: 'temps_contractuel',
    label: 'Écart heures planifiées / contrat',
    description: 'Les heures planifiées s\'éloignent significativement du volume horaire contractuel de l\'employé.',
    defaultEnabled: true,
    defaultBlocking: false,
  },
  {
    id: 'travail_nuit',
    label: 'Travail de nuit',
    description: 'Un shift se prolonge après 22h00, déclenchant la réglementation travail de nuit.',
    defaultEnabled: true,
    defaultBlocking: false,
  },
  {
    id: 'jours_feries',
    label: 'Shift un jour férié',
    description: 'Un créneau est posé sur un jour férié légal (majorations applicables selon convention).',
    defaultEnabled: true,
    defaultBlocking: false,
  },
  {
    id: 'coupure',
    label: 'Coupure trop courte',
    description: 'Délai insuffisant entre deux shifts du même employé dans la même journée.',
    defaultEnabled: false,
    defaultBlocking: false,
  },
  {
    id: 'coupures_max',
    label: 'Trop de coupures par jour',
    description: 'Un employé a plus d\'une coupure dans la même journée.',
    defaultEnabled: false,
    defaultBlocking: false,
  },
  {
    id: 'modification_retard',
    label: 'Modification planning en retard',
    description: 'Le planning est modifié moins de 3 jours avant la date concernée (délai de prévenance).',
    defaultEnabled: false,
    defaultBlocking: false,
  },
  {
    id: 'temps_journalier_min',
    label: 'Durée journalière trop courte',
    description: 'Un shift planifié est inférieur à la durée minimale de travail quotidienne définie.',
    defaultEnabled: false,
    defaultBlocking: false,
  },
  {
    id: 'absences_volume',
    label: 'Absences vs volume horaire',
    description: 'Le cumul des absences dépasse le volume horaire contractuel sur la période.',
    defaultEnabled: false,
    defaultBlocking: false,
  },
]

function buildDefaults(): AlertSettings {
  const out: AlertSettings = {}
  for (const a of ALERTS) {
    out[a.id] = { enabled: a.defaultEnabled, blocking: a.defaultBlocking }
  }
  return out
}

export default function AlertesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [alerts, setAlerts] = useState<AlertSettings>(buildDefaults())

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        if (data.alert_settings) {
          try {
            const parsed: AlertSettings = JSON.parse(data.alert_settings)
            // Merge with defaults to handle new alerts added later
            const merged = buildDefaults()
            for (const [id, cfg] of Object.entries(parsed)) {
              if (merged[id]) merged[id] = cfg
            }
            setAlerts(merged)
          } catch {
            // keep defaults
          }
        }
        setLoading(false)
      })
  }, [])

  function toggleEnabled(id: string) {
    setAlerts(prev => ({
      ...prev,
      [id]: {
        enabled: !prev[id].enabled,
        blocking: !prev[id].enabled ? prev[id].blocking : false,
      },
    }))
  }

  function toggleBlocking(id: string) {
    if (!alerts[id].enabled) return
    setAlerts(prev => ({
      ...prev,
      [id]: { ...prev[id], blocking: !prev[id].blocking },
    }))
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert_settings: JSON.stringify(alerts) }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const enabledCount = Object.values(alerts).filter(a => a.enabled).length
  const blockingCount = Object.values(alerts).filter(a => a.blocking).length

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Alertes planning</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez les règles de contrôle appliquées lors de la pose des shifts.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BellDot className="h-3.5 w-3.5 text-primary" />
            {enabledCount} active{enabledCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-destructive" />
            {blockingCount} bloquante{blockingCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground bg-muted/40 px-4 py-3 rounded-lg border border-border/50">
        <span className="flex items-center gap-2">
          <span className="inline-block w-8 h-4 rounded-full bg-primary/80" />
          Alerte active — affichée sur la grille
        </span>
        <span className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-destructive" />
          Bloquante — empêche la publication du planning
        </span>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_100px] bg-muted/60 border-b border-border px-4 py-2.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alerte</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Activer</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Bloquante</span>
        </div>

        {/* Rows */}
        {ALERTS.map((alert, i) => {
          const cfg = alerts[alert.id]
          const isLast = i === ALERTS.length - 1
          return (
            <div
              key={alert.id}
              className={cn(
                'grid grid-cols-[1fr_80px_100px] items-center px-4 py-3.5 transition-colors',
                !isLast && 'border-b border-border/60',
                cfg.enabled ? 'bg-card' : 'bg-muted/20',
              )}
            >
              {/* Label + description */}
              <div className="pr-4">
                <p className={cn(
                  'text-sm font-medium leading-tight',
                  cfg.enabled ? 'text-foreground' : 'text-muted-foreground',
                )}>
                  {alert.label}
                </p>
                <p className={cn(
                  'text-xs mt-0.5 leading-relaxed',
                  cfg.enabled ? 'text-muted-foreground' : 'text-muted-foreground/50',
                )}>
                  {alert.description}
                </p>
              </div>

              {/* Toggle enabled */}
              <div className="flex justify-center">
                <button
                  role="switch"
                  aria-checked={cfg.enabled}
                  onClick={() => toggleEnabled(alert.id)}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                    cfg.enabled ? 'bg-primary' : 'bg-muted-foreground/30',
                  )}
                >
                  <span className={cn(
                    'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                    cfg.enabled ? 'translate-x-4.5' : 'translate-x-0.5',
                  )} />
                </button>
              </div>

              {/* Checkbox blocking */}
              <div className="flex justify-center">
                <button
                  onClick={() => toggleBlocking(alert.id)}
                  disabled={!cfg.enabled}
                  className={cn(
                    'flex items-center justify-center w-5 h-5 rounded border-2 transition-all',
                    !cfg.enabled && 'opacity-30 cursor-not-allowed',
                    cfg.blocking && cfg.enabled
                      ? 'bg-destructive border-destructive'
                      : 'border-border bg-card hover:border-muted-foreground',
                  )}
                  title={cfg.enabled ? (cfg.blocking ? 'Bloquante — cliquer pour désactiver' : 'Non bloquante — cliquer pour rendre bloquante') : 'Activez l\'alerte pour configurer ce paramètre'}
                >
                  {cfg.blocking && cfg.enabled && (
                    <Lock className="h-2.5 w-2.5 text-white" />
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Explanation */}
      <div className="text-xs text-muted-foreground space-y-1 px-1">
        <p>
          <span className="font-medium text-foreground">Alerte bloquante :</span>{' '}
          la publication du planning est impossible tant que l&apos;alerte n&apos;est pas résolue.
        </p>
        <p>
          <span className="font-medium text-foreground">Alerte non bloquante :</span>{' '}
          un avertissement visuel s&apos;affiche sur la grille, la publication reste possible.
        </p>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[160px]">
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin" />Enregistrement…</>
            : saved
            ? <><Check className="h-4 w-4" />Enregistré !</>
            : 'Enregistrer les alertes'
          }
        </Button>
      </div>
    </div>
  )
}
