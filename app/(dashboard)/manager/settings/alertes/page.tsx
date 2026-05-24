'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Loader2, Check, BellDot, Lock, Mail, Zap } from 'lucide-react'

// ── Email notifications ───────────────────────────────────────────────────────

type EmailNotifId =
  | 'leave_request'
  | 'employee_late'
  | 'unjustified_absence'
  | 'planning_published'
  | 'overtime_exceeded'

const EMAIL_NOTIFS: { id: EmailNotifId; label: string; description: string }[] = [
  {
    id: 'leave_request',
    label: 'Nouvelle demande de congé',
    description: "Un employé soumet une demande de congé en attente de validation.",
  },
  {
    id: 'employee_late',
    label: 'Employé en retard',
    description: "Un employé n'a pas pointé à l'heure prévue.",
  },
  {
    id: 'unjustified_absence',
    label: 'Absence non justifiée',
    description: "Un shift est passé sans pointage ni justificatif.",
  },
  {
    id: 'planning_published',
    label: 'Planning publié',
    description: "Le planning de la semaine vient d'être publié.",
  },
  {
    id: 'overtime_exceeded',
    label: 'Dépassement heures supplémentaires',
    description: "Un employé dépasse son seuil d'heures supplémentaires configuré.",
  },
]

type EmailNotifSettings = Record<EmailNotifId, boolean>

const DEFAULT_EMAIL_NOTIFS: EmailNotifSettings = {
  leave_request:       true,
  employee_late:       true,
  unjustified_absence: true,
  planning_published:  true,
  overtime_exceeded:   true,
}

// ── Planning alerts ───────────────────────────────────────────────────────────

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
  { id: 'conflit_horaires',       label: "Conflit d'horaires",                        description: "Deux shifts se chevauchent pour le même employé sur la même journée.",                                                              defaultEnabled: true,  defaultBlocking: true  },
  { id: 'repos_journalier',       label: 'Repos journalier insuffisant',               description: "Minimum 11h de repos entre la fin d'un shift et le début du suivant (légal).",                                                     defaultEnabled: true,  defaultBlocking: true  },
  { id: 'repos_hebdomadaire',     label: 'Repos hebdomadaire insuffisant',             description: "Minimum 35h de repos continu par semaine (légal).",                                                                                  defaultEnabled: true,  defaultBlocking: true  },
  { id: 'volume_journalier_max',  label: 'Durée journalière maximale dépassée',        description: "Un shift dépasse 10h de travail effectif (plafond légal).",                                                                         defaultEnabled: true,  defaultBlocking: true  },
  { id: 'pause_obligatoire',      label: 'Pause obligatoire manquante',                description: "Un salarié travaille plus de 6h sans avoir de pause de 20 min minimum planifiée.",                                                  defaultEnabled: true,  defaultBlocking: false },
  { id: 'amplitude',              label: 'Amplitude horaire excessive (temps partiels)',description: "Plus de 12h entre le début et la fin de journée d'un salarié à temps partiel.",                                                    defaultEnabled: true,  defaultBlocking: false },
  { id: 'jours_consecutifs',      label: 'Jours consécutifs trop nombreux',            description: "Un salarié travaille plus de 6 jours d'affilée sans repos (légal).",                                                              defaultEnabled: true,  defaultBlocking: true  },
  { id: 'heures_complementaires', label: 'Dépassement des heures complémentaires',     description: "Les heures planifiées dépassent 33,33 % du volume horaire contractuel (limite légale pour les temps partiels).",                   defaultEnabled: true,  defaultBlocking: false },
  { id: 'temps_contractuel',      label: 'Écart heures planifiées / contrat',          description: "Les heures planifiées s'éloignent significativement du volume horaire contractuel de l'employé.",                                  defaultEnabled: true,  defaultBlocking: false },
  { id: 'travail_nuit',           label: 'Travail de nuit',                            description: "Un shift se prolonge après 22h00, déclenchant la réglementation travail de nuit.",                                                 defaultEnabled: true,  defaultBlocking: false },
  { id: 'jours_feries',           label: 'Shift un jour férié',                        description: "Un créneau est posé sur un jour férié légal (majorations applicables selon convention).",                                           defaultEnabled: true,  defaultBlocking: false },
  { id: 'coupure',                label: 'Coupure trop courte',                        description: "Délai insuffisant entre deux shifts du même employé dans la même journée.",                                                         defaultEnabled: false, defaultBlocking: false },
  { id: 'coupures_max',           label: 'Trop de coupures par jour',                  description: "Un employé a plus d'une coupure dans la même journée.",                                                                            defaultEnabled: false, defaultBlocking: false },
  { id: 'modification_retard',    label: 'Modification planning en retard',             description: "Le planning est modifié moins de 3 jours avant la date concernée (délai de prévenance).",                                          defaultEnabled: false, defaultBlocking: false },
  { id: 'temps_journalier_min',   label: 'Durée journalière trop courte',              description: "Un shift planifié est inférieur à la durée minimale de travail quotidienne définie.",                                              defaultEnabled: false, defaultBlocking: false },
  { id: 'absences_volume',        label: 'Absences vs volume horaire',                 description: "Le cumul des absences dépasse le volume horaire contractuel sur la période.",                                                       defaultEnabled: false, defaultBlocking: false },
]

// ── Automation rules ──────────────────────────────────────────────────────────

type AutomationId =
  | 'email_employee_planning'
  | 'email_employee_leave'
  | 'sync_leave_planning'
  | 'auto_justify_late_on_leave'
  | 'alert_cdd_expiry'

type AutomationSettings = Record<AutomationId, boolean>

const AUTOMATIONS: { id: AutomationId; label: string; description: string }[] = [
  {
    id: 'email_employee_planning',
    label: 'Email employé — planning publié',
    description: 'Envoie automatiquement le planning à chaque employé quand il est publié.',
  },
  {
    id: 'email_employee_leave',
    label: 'Email employé — congé approuvé / refusé',
    description: "Notifie l'employé par email dès que sa demande de congé est traitée.",
  },
  {
    id: 'sync_leave_planning',
    label: 'Afficher les congés approuvés sur le planning',
    description: "Les congés apparaissent automatiquement dans la grille de planning.",
  },
  {
    id: 'auto_justify_late_on_leave',
    label: 'Justifier auto. les retards pendant un congé',
    description: "Si un employé en congé approuvé pointe quand même, son retard est automatiquement justifié.",
  },
  {
    id: 'alert_cdd_expiry',
    label: 'Alerte fin de CDD imminente (< 30 jours)',
    description: "Signale dans le tableau des alertes les CDD dont l'échéance est dans moins de 30 jours.",
  },
]

const DEFAULT_AUTOMATIONS: AutomationSettings = {
  email_employee_planning:    true,
  email_employee_leave:       true,
  sync_leave_planning:        true,
  auto_justify_late_on_leave: false,
  alert_cdd_expiry:           true,
}

function buildDefaults(): AlertSettings {
  const out: AlertSettings = {}
  for (const a of ALERTS) out[a.id] = { enabled: a.defaultEnabled, blocking: a.defaultBlocking }
  return out
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AlertesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [alerts, setAlerts] = useState<AlertSettings>(buildDefaults())
  const [emailNotifs, setEmailNotifs] = useState<EmailNotifSettings>(DEFAULT_EMAIL_NOTIFS)
  const [automations, setAutomations] = useState<AutomationSettings>(DEFAULT_AUTOMATIONS)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        if (data.alert_settings) {
          try {
            const parsed: AlertSettings = JSON.parse(data.alert_settings)
            const merged = buildDefaults()
            for (const [id, cfg] of Object.entries(parsed)) {
              if (merged[id]) merged[id] = cfg
            }
            setAlerts(merged)
          } catch { /* keep defaults */ }
        }
        if (data.email_notifications) {
          try {
            const parsed = JSON.parse(data.email_notifications) as Partial<EmailNotifSettings>
            setEmailNotifs(prev => ({ ...prev, ...parsed }))
          } catch { /* keep defaults */ }
        }
        if (data.automation_rules) {
          try {
            const parsed = JSON.parse(data.automation_rules) as Partial<AutomationSettings>
            setAutomations(prev => ({ ...prev, ...parsed }))
          } catch { /* keep defaults */ }
        }
        setLoading(false)
      })
  }, [])

  function toggleEnabled(id: string) {
    setAlerts(prev => ({
      ...prev,
      [id]: { enabled: !prev[id].enabled, blocking: !prev[id].enabled ? prev[id].blocking : false },
    }))
  }

  function toggleBlocking(id: string) {
    if (!alerts[id].enabled) return
    setAlerts(prev => ({ ...prev, [id]: { ...prev[id], blocking: !prev[id].blocking } }))
  }

  function toggleEmailNotif(id: EmailNotifId) {
    setEmailNotifs(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert_settings: JSON.stringify(alerts),
        email_notifications: JSON.stringify(emailNotifs),
        automation_rules: JSON.stringify(automations),
      }),
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
    <div className="max-w-3xl mx-auto px-8 py-10 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Alertes email et règles de contrôle du planning.
        </p>
      </div>

      {/* ── Alertes email ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-sky-500" />
            </div>
            <div>
              <CardTitle className="text-base">Alertes email — Manager</CardTitle>
              <CardDescription>
                Choisissez les événements qui déclenchent un email vers le manager.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {EMAIL_NOTIFS.map(notif => (
              <div key={notif.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                <div>
                  <p className={cn('text-sm font-medium', emailNotifs[notif.id] ? 'text-foreground' : 'text-muted-foreground')}>
                    {notif.label}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{notif.description}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={emailNotifs[notif.id]}
                  onClick={() => toggleEmailNotif(notif.id)}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 ml-4 items-center rounded-full transition-colors focus:outline-none',
                    emailNotifs[notif.id] ? 'bg-primary' : 'bg-muted-foreground/30',
                  )}
                >
                  <span className={cn(
                    'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                    emailNotifs[notif.id] ? 'translate-x-4' : 'translate-x-0.5',
                  )} />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Règles d'automatisation ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <CardTitle className="text-base">Règles d&apos;automatisation</CardTitle>
              <CardDescription>
                Actions déclenchées automatiquement par le système.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {AUTOMATIONS.map(rule => (
              <div key={rule.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                <div>
                  <p className={cn('text-sm font-medium', automations[rule.id] ? 'text-foreground' : 'text-muted-foreground')}>
                    {rule.label}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">{rule.description}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={automations[rule.id]}
                  onClick={() => setAutomations(prev => ({ ...prev, [rule.id]: !prev[rule.id] }))}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 ml-4 items-center rounded-full transition-colors focus:outline-none',
                    automations[rule.id] ? 'bg-primary' : 'bg-muted-foreground/30',
                  )}
                >
                  <span className={cn(
                    'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                    automations[rule.id] ? 'translate-x-4' : 'translate-x-0.5',
                  )} />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Alertes planning ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Alertes planning</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Règles de contrôle appliquées lors de la pose des shifts.
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
          <div className="grid grid-cols-[1fr_80px_100px] bg-muted/60 border-b border-border px-4 py-2.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Alerte</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Activer</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Bloquante</span>
          </div>

          {ALERTS.map((alert, i) => {
            const cfg = alerts[alert.id]
            return (
              <div
                key={alert.id}
                className={cn(
                  'grid grid-cols-[1fr_80px_100px] items-center px-4 py-3.5 transition-colors',
                  i !== ALERTS.length - 1 && 'border-b border-border/60',
                  cfg.enabled ? 'bg-card' : 'bg-muted/20',
                )}
              >
                <div className="pr-4">
                  <p className={cn('text-sm font-medium leading-tight', cfg.enabled ? 'text-foreground' : 'text-muted-foreground')}>
                    {alert.label}
                  </p>
                  <p className={cn('text-xs mt-0.5 leading-relaxed', cfg.enabled ? 'text-muted-foreground' : 'text-muted-foreground/50')}>
                    {alert.description}
                  </p>
                </div>

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
                    title={cfg.enabled
                      ? (cfg.blocking ? 'Bloquante — cliquer pour désactiver' : 'Non bloquante — cliquer pour rendre bloquante')
                      : "Activez l'alerte pour configurer ce paramètre"}
                  >
                    {cfg.blocking && cfg.enabled && <Lock className="h-2.5 w-2.5 text-white" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-xs text-muted-foreground space-y-1 px-1">
          <p><span className="font-medium text-foreground">Alerte bloquante :</span>{' '}la publication du planning est impossible tant que l&apos;alerte n&apos;est pas résolue.</p>
          <p><span className="font-medium text-foreground">Alerte non bloquante :</span>{' '}un avertissement visuel s&apos;affiche sur la grille, la publication reste possible.</p>
        </div>
      </div>

      {/* ── Save ──────────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[160px]">
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
