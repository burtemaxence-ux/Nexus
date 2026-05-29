'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, Loader2, Bell, Users } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotificationPreferences {
  // Manager
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
  // Employee (autorisations manager)
  emp_planning_published: boolean   // toujours true, non désactivable
  emp_leave_response: boolean       // toujours true, non désactivable
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

// ── Toggle component ──────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-[26px] w-[46px] flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none',
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      style={{ minWidth: 46 }}
    >
      <span
        className={cn(
          'inline-block h-[22px] w-[22px] rounded-full bg-white shadow transition-transform duration-200',
          'absolute top-[2px]',
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
        )}
      />
    </button>
  )
}

// ── Select component ──────────────────────────────────────────────────────────

function InlineSelect<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select
      value={String(value)}
      onChange={e => {
        const raw = e.target.value
        const opt = options.find(o => String(o.value) === raw)
        if (opt) onChange(opt.value)
      }}
      className="text-[12px] px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
    >
      {options.map(o => (
        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
      ))}
    </select>
  )
}

// ── Row component ─────────────────────────────────────────────────────────────

function SettingRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  locked = false,
  extra,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  locked?: boolean
  extra?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-4 py-3.5 border-b border-[var(--border)] last:border-0" style={{ minHeight: 44 }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-medium text-[var(--text-primary)]">{label}</p>
          {locked && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-light)] text-[var(--accent)] font-medium">
              Toujours actif
            </span>
          )}
        </div>
        {description && (
          <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5 leading-snug">{description}</p>
        )}
        {extra && <div className="mt-2">{extra}</div>}
      </div>
      <div className="flex-shrink-0 pt-0.5">
        <Toggle checked={checked} onChange={onChange} disabled={disabled || locked} />
      </div>
    </div>
  )
}

// ── Accordion section (mobile) ────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: React.ElementType
  title: string
  badge?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left md:cursor-default"
      >
        <div className="h-8 w-8 rounded-lg bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-[var(--text-primary)]">{title}</p>
          {badge && <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{badge}</p>}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-[var(--text-tertiary)] transition-transform duration-200 md:hidden',
            open && 'rotate-180'
          )}
        />
      </button>
      <div className={cn('px-5 pb-2', !open && 'hidden md:block')}>
        {children}
      </div>
    </div>
  )
}

// ── Save indicator ────────────────────────────────────────────────────────────

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  if (state === 'idle') return null
  return (
    <div className={cn(
      'flex items-center gap-1.5 text-[12px] transition-opacity',
      state === 'saved' ? 'text-green-600' : 'text-[var(--text-tertiary)]'
    )}>
      {state === 'saving'
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Check className="h-3.5 w-3.5" />}
      {state === 'saving' ? 'Enregistrement…' : 'Enregistré'}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NotificationsSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Load preferences from settings
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          try {
            const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
            setPrefs({ ...DEFAULT_PREFS, ...parsed })
          } catch { /* keep defaults */ }
        }
        setLoading(false)
      })
  }, [])

  // Auto-save with debounce
  const save = useCallback(async (newPrefs: NotificationPreferences) => {
    setSaveState('saving')
    const supabase = createClient()
    await supabase
      .from('settings')
      .upsert({ key: SETTINGS_KEY, value: JSON.stringify(newPrefs) }, { onConflict: 'key' })
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }, [])

  function update<K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    save(next)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-tertiary)]" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:px-8 md:py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">Notifications</h1>
          <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">
            Gérez ce que vous et vos employés recevez comme notifications.
          </p>
        </div>
        <SaveIndicator state={saveState} />
      </div>

      {/* ── Section Manager ─────────────────────────────────────────────── */}
      <Section icon={Bell} title="Vos notifications" badge="Alertes reçues en tant que manager">

        <SettingRow
          label="Planning publié"
          description="Notification quand un planning est publié pour votre établissement."
          checked={prefs.planning_published}
          onChange={v => update('planning_published', v)}
        />
        <SettingRow
          label="Planning modifié"
          description="Notification quand des shifts sont modifiés après publication."
          checked={prefs.planning_modified}
          onChange={v => update('planning_modified', v)}
        />
        <SettingRow
          label="Planning verrouillé"
          description="Notification quand un planning passe en mode lecture seule."
          checked={prefs.planning_locked}
          onChange={v => update('planning_locked', v)}
        />
        <SettingRow
          label="Nouveau compte employé créé"
          description="Notification quand un employé s'inscrit via lien d'invitation."
          checked={prefs.new_employee_account}
          onChange={v => update('new_employee_account', v)}
        />
        <SettingRow
          label="Nouvelles demandes de congé"
          description="Notification à chaque nouvelle demande soumise par un employé."
          checked={prefs.leave_requests}
          onChange={v => update('leave_requests', v)}
        />
        <SettingRow
          label="Retards"
          description="Notification quand un employé ne pointe pas à l'heure prévue."
          checked={prefs.lateness_enabled}
          onChange={v => update('lateness_enabled', v)}
          extra={
            prefs.lateness_enabled && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[var(--text-secondary)]">Seuil de déclenchement :</span>
                <InlineSelect<5 | 10 | 15 | 30>
                  value={prefs.lateness_threshold}
                  onChange={v => update('lateness_threshold', v)}
                  options={[
                    { value: 5,  label: '5 min' },
                    { value: 10, label: '10 min' },
                    { value: 15, label: '15 min' },
                    { value: 30, label: '30 min' },
                  ]}
                />
              </div>
            )
          }
        />
        <SettingRow
          label="Employé n'a pas pointé sa sortie"
          description="Notification 30 min après la fin du shift si aucun pointage de sortie."
          checked={prefs.missing_clockin}
          onChange={v => update('missing_clockin', v)}
        />
        <SettingRow
          label="Alertes de conformité contractuelle"
          description="Notifications générées chaque dimanche par le moteur d'analyse (heures, CDD, essai…)."
          checked={prefs.compliance_alerts}
          onChange={v => update('compliance_alerts', v)}
        />
        <SettingRow
          label="Brief hebdomadaire manager"
          description="Résumé IA chaque lundi matin avec le bilan de la semaine écoulée."
          checked={prefs.weekly_brief}
          onChange={v => update('weekly_brief', v)}
          extra={
            prefs.weekly_brief && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[var(--text-secondary)]">Heure d&apos;envoi :</span>
                <InlineSelect<6 | 7 | 8>
                  value={prefs.weekly_brief_hour}
                  onChange={v => update('weekly_brief_hour', v)}
                  options={[
                    { value: 6, label: '6h00' },
                    { value: 7, label: '7h00' },
                    { value: 8, label: '8h00' },
                  ]}
                />
              </div>
            )
          }
        />
        <SettingRow
          label="Bilan mensuel"
          description="Synthèse mensuelle : présence, heures, conformité, congés."
          checked={prefs.monthly_report}
          onChange={v => update('monthly_report', v)}
        />
      </Section>

      {/* ── Section Employés ────────────────────────────────────────────── */}
      <Section icon={Users} title="Notifications de vos employés" badge="Ce que vous autorisez à envoyer à l'équipe">

        <SettingRow
          label="Planning publié"
          description="Les employés reçoivent leur planning dès qu'il est publié."
          checked={prefs.emp_planning_published}
          onChange={v => update('emp_planning_published', v)}
          locked
        />
        <SettingRow
          label="Réponse aux demandes de congé"
          description="Les employés sont notifiés dès l'acceptation ou le refus de leur demande."
          checked={prefs.emp_leave_response}
          onChange={v => update('emp_leave_response', v)}
          locked
        />
        <SettingRow
          label="Rappel de pointage sortie"
          description="Notification 30 min après la fin du shift si l'employé n'a pas pointé sa sortie."
          checked={prefs.emp_clockout_reminder}
          onChange={v => update('emp_clockout_reminder', v)}
        />
        <SettingRow
          label="Résumé hebdomadaire personnel"
          description="Chaque vendredi à 18h, résumé de la semaine : heures, retards, congés acquis."
          checked={prefs.emp_weekly_summary}
          onChange={v => update('emp_weekly_summary', v)}
        />
      </Section>

      {/* Note de bas de page */}
      <p className="text-[12px] text-[var(--text-tertiary)] text-center pb-4">
        Les préférences sont sauvegardées automatiquement.
      </p>
    </div>
  )
}
