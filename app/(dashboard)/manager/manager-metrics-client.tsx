'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/planning-utils'
import { Users, Clock, Timer, Palmtree, BarChart3, ArrowUp, ArrowDown } from 'lucide-react'
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist'
import { WeekLoadBars, type DayLoad } from '@/components/dashboard/week-load-bars'
import { TodayRoster } from '@/components/dashboard/today-roster'
import { OpenSlots } from '@/components/dashboard/open-slots'
import { WeeklyBriefCard } from '@/components/dashboard/weekly-brief-card'
import { ComplianceRing } from '@/components/dashboard/compliance-ring'
import { TodayTasks, type HomeTask } from '@/components/dashboard/today-tasks'
import { KpiCard } from '@/components/dashboard/kpi-card'

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

type ShiftRow = { date?: string; start_time?: string | null; end_time?: string | null; break_minutes?: number | null }

// Durée d'un shift en heures (gère les shifts de nuit et déduit la pause).
function shiftHours(s: ShiftRow): number {
  if (!s.start_time || !s.end_time) return 0
  const [sh, sm] = s.start_time.split(':').map(Number)
  const [eh, em] = s.end_time.split(':').map(Number)
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) mins += 24 * 60
  mins -= s.break_minutes ?? 0
  return Math.max(0, mins) / 60
}

// ── KPI colour presets (saturated accents read well on both themes) ───────────
const PALETTE = {
  red:    { color: '#fa5252', halo: 'rgba(250,82,82,0.28)', glow: 'linear-gradient(90deg,#fa5252,#ff8787)', iconBg: 'linear-gradient(135deg, rgba(250,82,82,0.16), rgba(250,82,82,0.06))' },
  green:  { color: '#12b886', halo: 'rgba(18,184,134,0.28)', glow: 'linear-gradient(90deg,#12b886,#38d9a9)', iconBg: 'linear-gradient(135deg, rgba(18,184,134,0.16), rgba(18,184,134,0.06))' },
  violet: { color: '#6C63FF', halo: 'rgba(108,99,255,0.30)', glow: 'linear-gradient(90deg,#6C63FF,#9b95ff)', iconBg: 'linear-gradient(135deg, rgba(108,99,255,0.18), rgba(108,99,255,0.06))' },
  orange: { color: '#f08c00', halo: 'rgba(240,140,0,0.26)', glow: 'linear-gradient(90deg,#f08c00,#ffc078)', iconBg: 'linear-gradient(135deg, rgba(240,140,0,0.16), rgba(240,140,0,0.06))' },
  gray:   { color: '#647085', halo: 'rgba(99,110,131,0.22)', glow: 'linear-gradient(90deg,#8b93a3,#b3b9c6)', iconBg: 'linear-gradient(135deg, rgba(99,110,131,0.14), rgba(99,110,131,0.05))' },
} as const

interface Metrics {
  employeeCount: number
  pendingCount: number
  latenessCount: number
  plannedHours: number
  hoursPct: number | null
  todayRate: number | null
  todayTotal: number
  todayPointed: number
  onDutyInitials: string[]
  exchangePending: number
  cddExpiring: number
  presenceSpark: number[]
  hoursSpark: number[]
  retardsSpark: number[]
  congesSpark: number[]
  equipeSpark: number[]
  weekLoad: DayLoad[]
  weekPublished: boolean
  onboardingSteps: { title: string; description: string; done: boolean; href: string; cta: string }[]
  onboardingAllDone: boolean
}

function MetricsSkeleton() {
  const block = { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }
  return (
    <div className="space-y-[22px]">
      <div className="rounded-[16px] border h-[88px] animate-pulse" style={block} />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-[14px]">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-[16px] border animate-pulse" style={{ ...block, minHeight: '170px' }} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[18px] items-start">
        <div className="lg:col-span-2 space-y-[18px]">
          <div className="rounded-[14px] border h-[200px] animate-pulse" style={block} />
          <div className="rounded-[14px] border h-[280px] animate-pulse" style={block} />
        </div>
        <div className="space-y-[18px]">
          <div className="rounded-[14px] border h-[260px] animate-pulse" style={block} />
        </div>
      </div>
    </div>
  )
}

export function ManagerMetricsClient() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)

  // Vérifie et corrige le setup manager à chaque chargement (idempotent via set-role)
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      fetch('/api/auth/set-role', { method: 'POST' })
        .then(r => r.json())
        .then(data => { if (data.role === 'manager' && !data.already_setup) window.location.reload() })
    })
  }, [])

  useEffect(() => {
    const supabase = createClient()

    async function fetchMetrics() {
      const today = new Date()
      const dow = today.getDay() || 7
      const monday = new Date(today); monday.setDate(today.getDate() - dow + 1)
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
      const prevMonday = new Date(monday); prevMonday.setDate(monday.getDate() - 7)
      const prevSunday = new Date(monday); prevSunday.setDate(monday.getDate() - 1)
      const iso = (d: Date) => d.toISOString().split('T')[0]
      const weekStart = iso(monday), weekEnd = iso(sunday)
      const prevStart = iso(prevMonday), prevEnd = iso(prevSunday)
      const monthStart = iso(new Date(today.getFullYear(), today.getMonth(), 1))
      const todayDate = iso(today)
      const in30 = iso(new Date(today.getTime() + 30 * 86400000))

      // Fenêtre de 8 semaines (lundi→dimanche) pour les sparklines de tendance.
      const SPARK_WEEKS = 8
      const sparkBuckets: { start: string; end: string }[] = []
      for (let i = SPARK_WEEKS - 1; i >= 0; i--) {
        const wkMon = new Date(monday); wkMon.setDate(monday.getDate() - i * 7)
        const wkSun = new Date(wkMon); wkSun.setDate(wkMon.getDate() + 6)
        sparkBuckets.push({ start: iso(wkMon), end: iso(wkSun) })
      }
      const sparkFrom = sparkBuckets[0].start

      const [
        { data: employees },
        { data: pendingLeaves },
        { data: nameRow },
        { data: weekShifts },
        { data: prevShifts },
        { data: monthLateness },
        { data: todayShifts },
        { data: todayPresences },
        { data: anyShift },
        { data: anyPublished },
        { data: weekStatus },
        { count: postesCount },
        { count: exchangePending },
        { count: cddExpiring },
        { data: latenessSpark },
        { data: leavesSpark },
        { data: contractsAll },
      ] = await Promise.all([
        supabase.from('profiles').select('id').eq('role', 'employee').eq('archived', false),
        supabase.from('leave_requests').select('id').eq('status', 'pending'),
        supabase.from('settings').select('value').eq('key', 'establishment_name').maybeSingle(),
        supabase.from('shifts').select('employee_id, date, start_time, end_time, break_minutes').gte('date', weekStart).lte('date', weekEnd).is('deleted_at', null),
        supabase.from('shifts').select('start_time, end_time, break_minutes').gte('date', prevStart).lte('date', prevEnd).is('deleted_at', null),
        supabase.from('lateness_records').select('id').gte('date', monthStart),
        supabase.from('shifts').select('employee_id, profiles:employee_id(full_name)').eq('date', todayDate).is('deleted_at', null),
        supabase.from('presences').select('employee_id, clock_in, clock_out').eq('date', todayDate).not('clock_in', 'is', null),
        supabase.from('shifts').select('id').is('deleted_at', null).limit(1),
        supabase.from('week_status').select('week_monday').eq('published', true).limit(1),
        supabase.from('week_status').select('published').eq('week_monday', weekStart).maybeSingle(),
        supabase.from('postes').select('*', { count: 'exact', head: true }),
        supabase.from('shift_exchanges').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).not('end_date', 'is', null).gte('end_date', todayDate).lte('end_date', in30),
        // Séries 8 semaines (sparklines réelles).
        supabase.from('lateness_records').select('date').gte('date', sparkFrom),
        supabase.from('leave_requests').select('created_at').gte('created_at', `${sparkFrom}T00:00:00`),
        supabase.from('contracts').select('employee_id, start_date, end_date'),
      ])

      const employeeCount = employees?.length ?? 0
      const pendingCount = pendingLeaves?.length ?? 0
      const latenessCount = monthLateness?.length ?? 0

      // Heures planifiées (durée des shifts - pauses), semaine en cours + N-1.
      const plannedHours = Math.round((weekShifts ?? []).reduce((s: number, x: ShiftRow) => s + shiftHours(x), 0))
      const prevHours = Math.round((prevShifts ?? []).reduce((s: number, x: ShiftRow) => s + shiftHours(x), 0))
      const hoursPct = prevHours > 0 ? Math.round(((plannedHours - prevHours) / prevHours) * 100) : null

      // Présence du jour : employés planifiés aujourd'hui ayant pointé.
      type TodayShiftRow = { employee_id: string; profiles: { full_name: string | null } | { full_name: string | null }[] | null }
      const todayRows = (todayShifts ?? []) as TodayShiftRow[]
      const pointedSet = new Set((todayPresences ?? []).map((p: { employee_id: string }) => p.employee_id))
      const todayEmpIds = Array.from(new Set(todayRows.map(s => s.employee_id)))
      const todayTotal = todayEmpIds.length
      const todayPointed = todayEmpIds.filter(id => pointedSet.has(id)).length
      const todayRate = todayTotal > 0 ? Math.round((todayPointed / todayTotal) * 100) : null

      // En poste : pointé sans avoir badgé la sortie.
      const onDutyIds = new Set(
        (todayPresences ?? []).filter((p: { clock_in: string | null; clock_out: string | null }) => p.clock_in && !p.clock_out)
          .map((p: { employee_id: string }) => p.employee_id)
      )
      const nameOf = (s: TodayShiftRow): string => {
        const pr = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
        return pr?.full_name ?? 'Employé'
      }
      const onDutyInitials = todayRows
        .filter(s => onDutyIds.has(s.employee_id))
        .map(s => getInitials(nameOf(s)))

      // Séries réelles pour les sparklines.
      const weekDates: string[] = []
      for (let i = 0; i < 7; i++) { const d = new Date(monday); d.setDate(monday.getDate() + i); weekDates.push(iso(d)) }
      // Densité de planning par jour (sparkline décorative, normalisée par la carte).
      const presenceSpark = weekDates.map(date => (weekShifts ?? []).filter((s: { date: string }) => s.date === date).length)
      const hoursSpark = weekDates.map(date =>
        Math.round((weekShifts ?? []).filter((s: ShiftRow) => s.date === date).reduce((sum: number, s: ShiftRow) => sum + shiftHours(s), 0))
      )
      const weekLoad: DayLoad[] = weekDates.map((date, i) => ({ day: DAY_LABELS[i], hours: hoursSpark[i], isToday: date === todayDate }))

      // Sparklines de tendance sur 8 semaines (données réelles).
      const latenessRows = (latenessSpark ?? []) as { date: string }[]
      const retardsSpark = sparkBuckets.map(b => latenessRows.filter(r => r.date >= b.start && r.date <= b.end).length)
      const leaveRows = (leavesSpark ?? []) as { created_at: string }[]
      const congesSpark = sparkBuckets.map(b => leaveRows.filter(r => {
        const d = r.created_at.slice(0, 10)
        return d >= b.start && d <= b.end
      }).length)
      const contractRows = (contractsAll ?? []) as { employee_id: string; start_date: string; end_date: string | null }[]
      const equipeSpark = sparkBuckets.map(b => new Set(
        contractRows.filter(c => c.start_date <= b.end && (c.end_date === null || c.end_date >= b.start)).map(c => c.employee_id)
      ).size)

      const isDefaultName = !nameRow?.value || nameRow.value === 'Mon établissement'
      const onboardingSteps = [
        { title: 'Nommer votre établissement', description: 'Ajoutez le nom et les informations de votre établissement.', done: !isDefaultName, href: '/manager/settings/organisation', cta: 'Configurer' },
        { title: 'Créer vos postes', description: 'Définissez les rôles de votre équipe (ex. Serveur, Cuisinier).', done: (postesCount ?? 0) > 0, href: '/manager/settings/postes', cta: 'Créer' },
        { title: 'Inviter des employés', description: 'Ajoutez les membres de votre équipe.', done: employeeCount > 0, href: '/manager/employees/new', cta: 'Inviter' },
        { title: 'Créer un premier shift', description: 'Planifiez votre premier horaire dans le planning.', done: (anyShift?.length ?? 0) > 0, href: '/manager/planning', cta: 'Planifier' },
        { title: 'Publier le planning', description: 'Rendez le planning visible pour vos employés.', done: (anyPublished?.length ?? 0) > 0, href: '/manager/planning', cta: 'Publier' },
      ]

      setMetrics({
        employeeCount, pendingCount, latenessCount, plannedHours, hoursPct,
        todayRate, todayTotal, todayPointed, onDutyInitials,
        exchangePending: exchangePending ?? 0, cddExpiring: cddExpiring ?? 0,
        presenceSpark, hoursSpark, retardsSpark, congesSpark, equipeSpark, weekLoad,
        weekPublished: !!(weekStatus as { published?: boolean } | null)?.published,
        onboardingSteps, onboardingAllDone: onboardingSteps.every(s => s.done),
      })
    }

    fetchMetrics()
  }, [])

  if (!metrics) return <MetricsSkeleton />

  const {
    employeeCount, pendingCount, latenessCount, plannedHours, hoursPct,
    todayRate, todayTotal, todayPointed, onDutyInitials,
    exchangePending, cddExpiring, presenceSpark, hoursSpark, retardsSpark, congesSpark, equipeSpark, weekLoad, weekPublished,
    onboardingSteps, onboardingAllDone,
  } = metrics

  const presence = todayRate === null ? PALETTE.gray : todayRate < 50 ? PALETTE.red : todayRate < 80 ? PALETTE.orange : PALETTE.green
  const allPointed = todayTotal > 0 && todayPointed === todayTotal

  // ── Tâches « À faire » dérivées de signaux réels ───────────────────────────
  const tasks: HomeTask[] = []
  if (!weekPublished) tasks.push({ id: 'publish', label: 'Publier le planning de la semaine', href: '/manager/planning' })
  if (todayTotal > 0 && todayPointed < todayTotal) tasks.push({ id: 'pointages', label: 'Vérifier les pointages du service', href: '/manager/presences', badge: todayTotal - todayPointed })
  if (pendingCount > 0) tasks.push({ id: 'conges', label: `Valider ${pendingCount} demande${pendingCount > 1 ? 's' : ''} de congé`, href: '/manager/conges', badge: pendingCount, badgeColor: 'var(--accent)' })
  if (exchangePending > 0) tasks.push({ id: 'echanges', label: `Valider ${exchangePending} échange${exchangePending > 1 ? 's' : ''} de shift`, href: '/manager/echanges', badge: exchangePending, badgeColor: 'var(--accent)' })
  if (cddExpiring > 0) tasks.push({ id: 'contrats', label: `${cddExpiring} contrat${cddExpiring > 1 ? 's' : ''} à échéance sous 30 j`, href: '/manager/employees', badge: cddExpiring })
  const homeTasks = tasks.slice(0, 4)

  const footerArrow = (up: boolean) => up
    ? <ArrowUp className="h-[13px] w-[13px] flex-shrink-0" style={{ color: 'var(--success)' }} strokeWidth={2.6} />
    : <ArrowDown className="h-[13px] w-[13px] flex-shrink-0" style={{ color: 'var(--danger)' }} strokeWidth={2.6} />
  const dot = (color: string) => <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />

  return (
    <div className="flex flex-col gap-[22px]">

      {/* ── BRIEF IA ───────────────────────────────────────────────────────── */}
      <div className="dashboard-s0"><WeeklyBriefCard /></div>

      {/* ── ONBOARDING (contextuel) ────────────────────────────────────────── */}
      {!onboardingAllDone && (
        <div className="dashboard-s1"><OnboardingChecklist steps={onboardingSteps} /></div>
      )}

      {/* ── KPI CARDS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-[14px] dashboard-s1">
        <KpiCard
          label="Présence" value={todayRate ?? 0} suffix="%" isNull={todayRate === null}
          color={presence.color} halo={presence.halo} glow={presence.glow} iconBg={presence.iconBg}
          icon={BarChart3} sparkData={presenceSpark} gradientId="kpi-presence"
          footer={todayTotal === 0
            ? <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>Aucun service aujourd&apos;hui</span>
            : <div className="flex items-center" style={{ gap: '5px' }}>
                {footerArrow(allPointed)}
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: allPointed ? 'var(--success)' : 'var(--danger)' }}>{todayPointed}/{todayTotal}</span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>pointés</span>
              </div>}
        />
        <KpiCard
          label="Heures planifiées" value={plannedHours} suffix="h"
          color={PALETTE.green.color} halo={PALETTE.green.halo} glow={PALETTE.green.glow} iconBg={PALETTE.green.iconBg}
          icon={Timer} sparkData={hoursSpark} gradientId="kpi-hours"
          footer={hoursPct === null
            ? <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>planifiées cette semaine</span>
            : <div className="flex items-center" style={{ gap: '5px' }}>
                {footerArrow(hoursPct >= 0)}
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: hoursPct >= 0 ? 'var(--success)' : 'var(--danger)', whiteSpace: 'nowrap' }}>{hoursPct >= 0 ? '+' : ''}{hoursPct}%</span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>vs N-1</span>
              </div>}
        />
        <KpiCard
          label="Équipe active" value={employeeCount}
          color={PALETTE.violet.color} halo={PALETTE.violet.halo} glow={PALETTE.violet.glow} iconBg={PALETTE.violet.iconBg}
          icon={Users} gradientId="kpi-team" sparkData={equipeSpark.some(v => v > 0) ? equipeSpark : undefined}
          footer={onDutyInitials.length === 0
            ? <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>Personne en poste</span>
            : <div className="flex items-center">
                {onDutyInitials.slice(0, 3).map((ini, i) => (
                  <span key={i} className="flex items-center justify-center" style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-light)', border: '1.5px solid var(--bg-card)', marginLeft: i === 0 ? 0 : '-6px', fontSize: '8px', fontWeight: 700, color: 'var(--accent)' }}>{ini}</span>
                ))}
                {onDutyInitials.length > 3 && (
                  <span className="flex items-center justify-center" style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--muted)', border: '1.5px solid var(--bg-card)', marginLeft: '-6px', fontSize: '8px', fontWeight: 700, color: 'var(--text-tertiary)' }}>+{onDutyInitials.length - 3}</span>
                )}
                <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginLeft: '8px', whiteSpace: 'nowrap' }}>en poste</span>
              </div>}
        />
        <KpiCard
          label="Congés en attente" value={pendingCount}
          color={PALETTE.orange.color} halo={PALETTE.orange.halo} glow={PALETTE.orange.glow} iconBg={PALETTE.orange.iconBg}
          icon={Palmtree} gradientId="kpi-leaves" sparkData={congesSpark.some(v => v > 0) ? congesSpark : undefined}
          footer={pendingCount === 0
            ? <div className="flex items-center" style={{ gap: '6px' }}>{dot('var(--success)')}<span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--success)' }}>Tout à jour</span></div>
            : <div className="flex items-center" style={{ gap: '6px' }}>{dot('var(--warning)')}<span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--warning)' }}>{pendingCount} à traiter</span></div>}
        />
        <KpiCard
          label="Retards ce mois" value={latenessCount}
          color={PALETTE.gray.color} halo={PALETTE.gray.halo} glow={PALETTE.gray.glow} iconBg={PALETTE.gray.iconBg}
          icon={Clock} gradientId="kpi-late" sparkData={retardsSpark.some(v => v > 0) ? retardsSpark : undefined}
          footer={latenessCount === 0
            ? <div className="flex items-center" style={{ gap: '6px' }}>{dot('var(--success)')}<span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--success)' }}>Aucun ce mois</span></div>
            : <div className="flex items-center" style={{ gap: '6px' }}>{dot('var(--danger)')}<span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--danger)' }}>{latenessCount} à vérifier</span></div>}
        />
      </div>

      {/* ── 2 COLONNES (2fr / 1fr) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[18px] items-start dashboard-s2">

        {/* COLONNE PRINCIPALE */}
        <div className="lg:col-span-2 flex flex-col gap-[18px]">
          <TodayRoster />
          <OpenSlots />
          <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(16,24,40,0.05), 0 10px 26px -12px rgba(16,24,40,0.12)' }}>
            <div className="flex items-center justify-between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Charge de la semaine</p>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{plannedHours} h planifiées</span>
            </div>
            <div style={{ padding: '18px 18px 14px' }}>
              <WeekLoadBars data={weekLoad} />
            </div>
          </div>
        </div>

        {/* COLONNE LATÉRALE */}
        <div className="flex flex-col gap-[18px]">
          <ComplianceRing />
          <TodayTasks tasks={homeTasks} />
        </div>
      </div>
    </div>
  )
}
