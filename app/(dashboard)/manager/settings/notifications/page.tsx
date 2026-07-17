'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Check, Loader2, Bell, BellRing, Users, Smartphone, Mail, Save,
  CalendarCheck, CalendarClock, Lock, UserPlus, Umbrella, Timer, LogOut,
  ShieldAlert, Sparkles, BarChart3, MailCheck, FileText,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotificationPreferences {
  planning_published: boolean
  planning_modified: boolean
  planning_locked: boolean
  new_employee_account: boolean
  leave_requests: boolean
  lateness_enabled: boolean
  lateness_threshold: 5 | 10 | 15 | 30
  missing_clockin: boolean
  compliance_alerts: boolean
  weekly_brief: boolean
  weekly_brief_hour: 6 | 7 | 8
  monthly_report: boolean
  emp_planning_published: boolean
  emp_leave_response: boolean
  emp_clockout_reminder: boolean
  emp_weekly_summary: boolean
}

const DEFAULT_PREFS: NotificationPreferences = {
  planning_published: true,
  planning_modified: true,
  planning_locked: false,
  new_employee_account: true,
  leave_requests: true,
  lateness_enabled: true,
  lateness_threshold: 10,
  missing_clockin: true,
  compliance_alerts: true,
  weekly_brief: true,
  weekly_brief_hour: 7,
  monthly_report: true,
  emp_planning_published: true,
  emp_leave_response: true,
  emp_clockout_reminder: true,
  emp_weekly_summary: true,
}

const SETTINGS_KEY = 'notification_preferences'

type BoolKey = {
  [K in keyof NotificationPreferences]: NotificationPreferences[K] extends boolean ? K : never
}[keyof NotificationPreferences]

type Row = { key: BoolKey; icon: typeof Bell; label: string; description: string; locked?: boolean }

const MANAGER_ROWS: Row[] = [
  { key: 'planning_published',   icon: CalendarCheck, label: 'Planning publié',                     description: "Notification quand un planning est publié pour votre établissement." },
  { key: 'planning_modified',    icon: CalendarClock, label: 'Planning modifié',                    description: "Notification quand des shifts sont modifiés après publication." },
  { key: 'planning_locked',      icon: Lock,          label: 'Planning verrouillé',                 description: "Notification quand un planning passe en mode lecture seule." },
  { key: 'new_employee_account', icon: UserPlus,      label: 'Nouveau compte employé créé',         description: "Notification quand un employé s'inscrit via lien d'invitation." },
  { key: 'leave_requests',       icon: Umbrella,      label: 'Nouvelles demandes de congé',         description: "Notification à chaque nouvelle demande soumise par un employé." },
  { key: 'lateness_enabled',     icon: Timer,         label: 'Retards',                             description: "Notification quand un employé ne pointe pas à l'heure prévue." },
  { key: 'missing_clockin',      icon: LogOut,        label: "Employé n'a pas pointé sa sortie",    description: "Notification 30 min après la fin du shift si aucun pointage de sortie." },
  { key: 'compliance_alerts',    icon: ShieldAlert,   label: 'Alertes de conformité contractuelle', description: "Notifications générées chaque dimanche par le moteur d'analyse (heures, CDD, essai…)." },
  { key: 'weekly_brief',         icon: Sparkles,      label: 'Brief hebdomadaire manager',          description: "Résumé IA chaque lundi matin avec le bilan de la semaine écoulée." },
  { key: 'monthly_report',       icon: BarChart3,     label: 'Bilan mensuel',                       description: "Synthèse mensuelle : présence, heures, conformité, congés." },
]

const EMPLOYEE_ROWS: Row[] = [
  { key: 'emp_planning_published', icon: CalendarCheck, label: 'Planning publié',                  description: "Les employés reçoivent leur planning dès qu'il est publié.", locked: true },
  { key: 'emp_leave_response',     icon: MailCheck,     label: 'Réponse aux demandes de congé',    description: "Les employés sont notifiés dès l'acceptation ou le refus de leur demande.", locked: true },
  { key: 'emp_clockout_reminder',  icon: LogOut,        label: 'Rappel de pointage sortie',        description: "Notification 30 min après la fin du shift si l'employé n'a pas pointé sa sortie." },
  { key: 'emp_weekly_summary',     icon: FileText,      label: 'Résumé hebdomadaire personnel',    description: "Chaque vendredi à 18h, résumé de la semaine : heures, retards, congés acquis." },
]

export default function NotificationsSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((s: Record<string, string>) => {
        if (s[SETTINGS_KEY]) {
          try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(s[SETTINGS_KEY]) }) } catch { /* keep defaults */ }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Sauvegarde via /api/settings (scopé établissement, conflit composite) —
  // corrige l'ancien upsert direct onConflict:'key' qui échouait silencieusement.
  const save = useCallback(async (newPrefs: NotificationPreferences) => {
    setSaveState('saving')
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [SETTINGS_KEY]: JSON.stringify(newPrefs) }),
    })
    setSaveState(res.ok ? 'saved' : 'idle')
    if (res.ok) setTimeout(() => setSaveState('idle'), 2000)
  }, [])

  function update<K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    save(next)
  }

  const activeCount = [...MANAGER_ROWS, ...EMPLOYEE_ROWS].filter(r => prefs[r.key]).length

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Loader2 className="ic20 nx-spin" style={{ color: 'var(--text-tertiary)' }} /></div>
  }

  const renderRow = (row: Row) => {
    const on = prefs[row.key]
    const Icon = row.icon
    return (
      <div key={row.key} className={`nx-notif-row ${on ? 'on' : ''}`}>
        <div className="nx-notif-ico"><Icon className="ic16" /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{row.label}</p>
            {row.locked && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, fontWeight: 500, background: 'var(--accent-light)', color: 'var(--accent)' }}>Toujours actif</span>}
          </div>
          <p style={{ fontSize: 12, marginTop: 2, lineHeight: 1.4, color: 'var(--text-tertiary)' }}>{row.description}</p>
          {row.key === 'lateness_enabled' && on && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Seuil de déclenchement :</span>
              <select className="nx-selmini" value={prefs.lateness_threshold} onChange={e => update('lateness_threshold', Number(e.target.value) as 5 | 10 | 15 | 30)}>
                <option value={5}>5 min</option><option value={10}>10 min</option><option value={15}>15 min</option><option value={30}>30 min</option>
              </select>
            </div>
          )}
          {row.key === 'weekly_brief' && on && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Heure d&apos;envoi :</span>
              <select className="nx-selmini" value={prefs.weekly_brief_hour} onChange={e => update('weekly_brief_hour', Number(e.target.value) as 6 | 7 | 8)}>
                <option value={6}>6h00</option><option value={7}>7h00</option><option value={8}>8h00</option>
              </select>
            </div>
          )}
        </div>
        <button
          className={`nx-switch ${on ? 'on' : ''}`}
          onClick={() => !row.locked && update(row.key, !on)}
          disabled={row.locked}
          aria-label={row.label}
          style={{ flexShrink: 0 }}
        />
      </div>
    )
  }

  return (
    <div className="nx-planpage" style={{ maxWidth: 672, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Hero */}
      <div className="nx-notif-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><BellRing className="ic20" style={{ color: '#fff' }} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", letterSpacing: '-.01em' }}>Restez au courant, sans être submergé</p>
            <p style={{ fontSize: 12.5, opacity: .85, marginTop: 2 }}>Choisissez précisément ce qui mérite de vous interrompre.</p>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <p style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{activeCount}</p>
            <p style={{ fontSize: 10, opacity: .8, marginTop: 3 }}>actives</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {[{ icon: Smartphone, label: 'Push mobile' }, { icon: Mail, label: 'Email' }, { icon: Save, label: 'Sauvegarde auto' }].map(({ icon: Icon, label }) => (
            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: 'rgba(255,255,255,.12)' }}><Icon className="ic12" />{label}</span>
          ))}
        </div>
      </div>

      {/* Manager */}
      <div className="nx-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="nx-ico" style={{ background: 'var(--accent-light)' }}><Bell className="ic16" style={{ color: 'var(--accent)' }} /></div>
            <div><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Vos notifications</p><p style={{ fontSize: 11, marginTop: 2, color: 'var(--text-tertiary)' }}>Alertes reçues en tant que manager</p></div>
          </div>
          {saveState !== 'idle' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: saveState === 'saved' ? 'var(--success)' : 'var(--text-tertiary)', flexShrink: 0 }}>
              {saveState === 'saving' ? <Loader2 className="ic14 nx-spin" /> : <Check className="ic14" />}{saveState === 'saving' ? 'Enregistrement…' : 'Enregistré'}
            </span>
          )}
        </div>
        <div className="nx-notif-list" style={{ padding: '8px 20px' }}>
          {MANAGER_ROWS.map(renderRow)}
        </div>
      </div>

      {/* Employee */}
      <div className="nx-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
          <div className="nx-ico" style={{ background: 'var(--accent-light)' }}><Users className="ic16" style={{ color: 'var(--accent)' }} /></div>
          <div><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Notifications de vos employés</p><p style={{ fontSize: 11, marginTop: 2, color: 'var(--text-tertiary)' }}>Ce que vous autorisez à envoyer à l’équipe</p></div>
        </div>
        <div className="nx-notif-list" style={{ padding: '8px 20px' }}>
          {EMPLOYEE_ROWS.map(renderRow)}
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', paddingBottom: 8 }}>Les préférences sont sauvegardées automatiquement.</p>
    </div>
  )
}
