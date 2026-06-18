'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar, Users, Clock, Settings, BarChart3,
  ArrowRight, AlertTriangle, Palmtree, Timer, ArrowLeftRight, FileText,
} from 'lucide-react'
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist'
import { ComplianceOverview } from '@/components/dashboard/compliance-overview'
import { WeekLoadChart, type DayLoad } from '@/components/dashboard/week-load-chart'
import { TodayRoster } from '@/components/dashboard/today-roster'
import { WeeklyBriefCard } from '@/components/dashboard/weekly-brief-card'
import type { ElementType } from 'react'

interface ModuleConfig {
  title: string
  description: string
  icon: ElementType
  href: string
  accentColor: string
  accentBg: string
}

const SECONDARY_MODULES: ModuleConfig[] = [
  {
    title: 'Employés',
    description: 'Profils, contrats et rôles.',
    icon: Users,
    href: '/manager/employees',
    accentColor: '#00D4AA',
    accentBg: 'rgba(0,212,170,0.15)',
  },
  {
    title: 'Rapport',
    description: 'Synthèse horaire et coûts.',
    icon: BarChart3,
    href: '/manager/rapport',
    accentColor: '#6C63FF',
    accentBg: 'rgba(108,99,255,0.15)',
  },
  {
    title: 'Congés',
    description: "Demandes et soldes d'absence.",
    icon: Palmtree,
    href: '/manager/conges',
    accentColor: '#FFB347',
    accentBg: 'rgba(255,179,71,0.15)',
  },
  {
    title: 'Présences',
    description: 'Horaires réels et pointages.',
    icon: Clock,
    href: '/manager/presences',
    accentColor: '#FF6B6B',
    accentBg: 'rgba(255,107,107,0.15)',
  },
  {
    title: 'Paramètres',
    description: 'Configuration et règles.',
    icon: Settings,
    href: '/manager/settings',
    accentColor: '#5a5a72',
    accentBg: 'rgba(90,90,114,0.15)',
  },
]

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

interface Metrics {
  employeeCount: number
  pendingCount: number
  presenceRate: number | null
  totalShifts: number
  plannedHours: number
  presentCount: number
  latenessCount: number
  exchangePending: number
  cddExpiring: number
  sparklineData: number[]
  weekLoad: DayLoad[]
  onboardingSteps: { title: string; description: string; done: boolean; href: string; cta: string }[]
  onboardingAllDone: boolean
}

function MetricsSkeleton() {
  return (
    <div className="space-y-6" style={{ minHeight: '560px' }}>
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-[14px] p-5 flex flex-col gap-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: '170px' }}>
            <div className="w-9 h-9 rounded-[10px] animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            <div className="h-2 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            <div className="h-8 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
          </div>
        ))}
      </div>
      {/* Modules skeleton */}
      <div className="space-y-3">
        <div className="h-3 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
        <div className="rounded-xl border px-5 py-4 h-[72px] animate-pulse" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', borderWidth: '0.5px' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="rounded-xl border h-[110px] animate-pulse" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)', borderWidth: '0.5px' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  const h = 22
  const barW = 5
  const gap = 2
  const totalW = data.length * (barW + gap) - gap
  return (
    <svg width={totalW} height={h} style={{ display: 'block' }} aria-hidden="true">
      {data.map((val, i) => {
        const barH = val > 0 ? Math.max(4, Math.round((val / max) * h)) : 4
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={h - barH}
            width={barW}
            height={barH}
            rx={2}
            fill={val > 0 ? color : 'var(--border)'}
            opacity={val > 0 ? 0.7 : 1}
          />
        )
      })}
    </svg>
  )
}

function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    let startTime: number | null = null
    let rafId: number
    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) { rafId = requestAnimationFrame(step) }
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [target, duration])
  return value
}

interface KpiCardProps {
  label: string
  value: number
  color: string
  icon: ElementType
  iconBg: string
  suffix?: string
  subLabel?: string
  subLabelColored?: boolean
  isNull?: boolean
  sparkline?: number[]
}

function KpiCard({ label, value, color, icon: Icon, iconBg, suffix = '', subLabel, subLabelColored = false, isNull = false, sparkline }: KpiCardProps) {
  const animated = useCountUp(value)
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--border-hover)' : 'var(--border)'}`,
        borderRadius: '14px',
        padding: '18px 20px',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 0 0 1px rgba(108,99,255,0.2), 0 10px 30px rgba(16,24,40,0.12), 0 0 40px rgba(108,99,255,0.06)' : '0 1px 3px rgba(16,24,40,0.06)',
        transition: 'all 200ms ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontFamily: 'var(--font-dm-sans)', margin: 0 }}>
          {label}
        </p>
        <div style={{ width: '30px', height: '30px', borderRadius: '9px', backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon className="h-[15px] w-[15px]" style={{ color }} />
        </div>
      </div>
      <p style={{ fontSize: '30px', fontWeight: 700, lineHeight: 1.05, color, fontFamily: 'var(--font-syne)', margin: 0, fontVariantNumeric: 'tabular-nums lining-nums' }}>
        {isNull ? '—' : (
          <>
            {animated}
            {suffix && (
              <span style={{ fontSize: '17px', fontWeight: 600, marginLeft: '3px', color: 'var(--text-tertiary)' }}>{suffix}</span>
            )}
          </>
        )}
      </p>
      {subLabel && (
        <p style={{ fontSize: '12px', color: subLabelColored ? color : 'var(--text-secondary)', margin: 0 }}>{subLabel}</p>
      )}
      {sparkline && (
        <div style={{ marginTop: '2px' }}>
          <MiniSparkline data={sparkline} color={color} />
        </div>
      )}
    </div>
  )
}

export function ManagerMetricsClient() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [modulesVisible, setModulesVisible] = useState(false)
  const [hoveredModule, setHoveredModule] = useState<string | null>(null)

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
      const weekStart = monday.toISOString().split('T')[0]
      const weekEnd = sunday.toISOString().split('T')[0]
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
      const todayDate = today.toISOString().split('T')[0]
      const in30 = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0]

      const [
        { data: employees },
        { data: pendingLeaves },
        { data: nameRow },
        { data: weekShifts },
        { data: weekPresences },
        { data: monthLateness },
        { data: anyShift },
        { data: anyPublished },
        { count: postesCount },
        { count: exchangePending },
        { count: cddExpiring },
      ] = await Promise.all([
        supabase.from('profiles').select('id').eq('role', 'employee').eq('archived', false),
        supabase.from('leave_requests').select('id').eq('status', 'pending'),
        supabase.from('settings').select('value').eq('key', 'establishment_name').maybeSingle(),
        supabase.from('shifts').select('employee_id, date, start_time, end_time, break_minutes').gte('date', weekStart).lte('date', weekEnd).is('deleted_at', null),
        supabase.from('presences').select('employee_id, date').gte('date', weekStart).lte('date', weekEnd).not('clock_in', 'is', null),
        supabase.from('lateness_records').select('id').gte('date', monthStart),
        supabase.from('shifts').select('id').is('deleted_at', null).limit(1),
        supabase.from('week_status').select('id').eq('published', true).limit(1),
        supabase.from('postes').select('*', { count: 'exact', head: true }),
        supabase.from('shift_exchanges').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval'),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).not('end_date', 'is', null).gte('end_date', todayDate).lte('end_date', in30),
      ])

      const employeeCount = employees?.length ?? 0
      const pendingCount = pendingLeaves?.length ?? 0
      const totalShifts = weekShifts?.length ?? 0
      const shiftKeys = new Set((weekShifts ?? []).map((s: { employee_id: string; date: string }) => `${s.employee_id}_${s.date}`))
      const presentCount = (weekPresences ?? []).filter((p: { employee_id: string; date: string }) => shiftKeys.has(`${p.employee_id}_${p.date}`)).length
      const presenceRate = totalShifts > 0 ? Math.round(presentCount / totalShifts * 100) : null
      const latenessCount = monthLateness?.length ?? 0

      // Heures planifiées cette semaine (durée des shifts - pauses). Toujours
      // exact, sans dépendre des taux horaires (qui vivent côté contrats).
      const plannedHours = Math.round(
        (weekShifts ?? []).reduce((sum: number, s: ShiftRow) => sum + shiftHours(s), 0)
      )

      const weekDates: string[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        weekDates.push(d.toISOString().split('T')[0])
      }
      const sparklineData = weekDates.map(date => {
        const dayShifts = (weekShifts ?? []).filter((s: { employee_id: string; date: string }) => s.date === date).length
        if (dayShifts === 0) return 0
        const dayPresent = (weekPresences ?? []).filter((p: { employee_id: string; date: string }) =>
          p.date === date && shiftKeys.has(`${p.employee_id}_${p.date}`)
        ).length
        return Math.round((dayPresent / dayShifts) * 100)
      })

      const weekLoad: DayLoad[] = weekDates.map((date, i) => ({
        day: DAY_LABELS[i],
        hours: Math.round(
          (weekShifts ?? []).filter((s: ShiftRow) => s.date === date).reduce((sum: number, s: ShiftRow) => sum + shiftHours(s), 0)
        ),
        isToday: date === todayDate,
      }))

      const isDefaultName = !nameRow?.value || nameRow.value === 'Mon établissement'

      const onboardingSteps = [
        {
          title: "Nommer votre établissement",
          description: "Ajoutez le nom et les informations de votre établissement.",
          done: !isDefaultName,
          href: '/manager/settings/organisation',
          cta: 'Configurer',
        },
        {
          title: 'Créer vos postes',
          description: "Définissez les rôles de votre équipe (ex. Serveur, Cuisinier).",
          done: (postesCount ?? 0) > 0,
          href: '/manager/settings/postes',
          cta: 'Créer',
        },
        {
          title: 'Inviter des employés',
          description: "Ajoutez les membres de votre équipe.",
          done: employeeCount > 0,
          href: '/manager/employees/new',
          cta: 'Inviter',
        },
        {
          title: 'Créer un premier shift',
          description: "Planifiez votre premier horaire dans le planning.",
          done: (anyShift?.length ?? 0) > 0,
          href: '/manager/planning',
          cta: 'Planifier',
        },
        {
          title: 'Publier le planning',
          description: "Rendez le planning visible pour vos employés.",
          done: (anyPublished?.length ?? 0) > 0,
          href: '/manager/planning',
          cta: 'Publier',
        },
      ]

      setMetrics({
        employeeCount,
        pendingCount,
        presenceRate,
        totalShifts,
        plannedHours,
        presentCount,
        latenessCount,
        exchangePending: exchangePending ?? 0,
        cddExpiring: cddExpiring ?? 0,
        sparklineData,
        weekLoad,
        onboardingSteps,
        onboardingAllDone: onboardingSteps.every(s => s.done),
      })
    }

    fetchMetrics()
  }, [])

  useEffect(() => {
    if (!metrics) return
    const t = setTimeout(() => setModulesVisible(true), 50)
    return () => clearTimeout(t)
  }, [metrics])

  if (!metrics) return <MetricsSkeleton />

  const { employeeCount, pendingCount, presenceRate, totalShifts, plannedHours, presentCount, latenessCount, exchangePending, cddExpiring, sparklineData, weekLoad, onboardingSteps, onboardingAllDone } = metrics

  const presence = presenceRate === null
    ? { color: 'var(--text-tertiary)', iconBg: 'rgba(90,90,114,0.15)', label: 'Aucun shift planifié' }
    : presenceRate >= 80
    ? { color: '#00D4AA', iconBg: 'rgba(0,212,170,0.15)', label: 'Bonne présence' }
    : presenceRate >= 50
    ? { color: '#FFB347', iconBg: 'rgba(255,179,71,0.15)', label: 'Présence à surveiller' }
    : { color: '#FF6B6B', iconBg: 'rgba(255,107,107,0.15)', label: 'Présence insuffisante' }

  return (
    <div className="space-y-6">

      {/* ── BRIEFING IA (lundi) ───────────────────────────────────────────── */}
      <div className="dashboard-s0">
        <WeeklyBriefCard />
      </div>

      {/* ── ONBOARDING ────────────────────────────────────────────────────── */}
      {!onboardingAllDone && (
        <div className="dashboard-s2">
          <OnboardingChecklist steps={onboardingSteps} />
        </div>
      )}

      {/* ── KPI CARDS ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 dashboard-s1">
        <KpiCard
          label="Présence"
          value={presenceRate ?? 0}
          suffix="%"
          color={presence.color}
          icon={BarChart3}
          iconBg={presence.iconBg}
          subLabel={presence.label}
          subLabelColored
          isNull={presenceRate === null}
          sparkline={sparklineData}
        />
        <KpiCard
          label="Heures"
          value={plannedHours}
          suffix="h"
          color="#00D4AA"
          icon={Timer}
          iconBg="rgba(0,212,170,0.15)"
          subLabel="planifiées cette semaine"
        />
        <KpiCard
          label="Équipe"
          value={employeeCount}
          color="#6C63FF"
          icon={Users}
          iconBg="rgba(108,99,255,0.15)"
          subLabel="employés actifs"
        />
        <KpiCard
          label="Congés en attente"
          value={pendingCount}
          color="#FFB347"
          icon={Palmtree}
          iconBg="rgba(255,179,71,0.15)"
          subLabel="demandes"
        />
        <KpiCard
          label="Retards ce mois"
          value={latenessCount}
          color="#FF6B6B"
          icon={Clock}
          iconBg="rgba(255,107,107,0.15)"
          subLabel="enregistrés"
        />
      </div>

      {/* ── CONFORMITÉ (différenciateur Quartzbase) ───────────────────────── */}
      <div className="dashboard-s2">
        <ComplianceOverview />
      </div>

      {/* ── SERVICE DU JOUR (live) ────────────────────────────────────────── */}
      <div className="dashboard-s2">
        <TodayRoster />
      </div>

      {/* ── SEMAINE EN COURS ──────────────────────────────────────────────── */}
      <div
        className="dashboard-s2 rounded-[14px] border overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Charge de la semaine</p>
          <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{plannedHours} h planifiées</span>
        </div>
        <div className="px-3 py-4">
          <WeekLoadChart data={weekLoad} />
        </div>
      </div>

      {/* ── ALERTES ───────────────────────────────────────────────────────── */}
      {(pendingCount > 0 || latenessCount > 0 || exchangePending > 0 || cddExpiring > 0) && (
        <div className="space-y-2 dashboard-s2">
          {pendingCount > 0 && (
            <Link href="/manager/conges">
              <div className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-[rgba(255,179,71,0.05)]"
                style={{ backgroundColor: 'rgba(255,179,71,0.08)', border: '1px solid rgba(255,179,71,0.2)', borderRadius: '10px' }}
              >
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#FFB347' }} />
                <p className="flex-1 text-[13px]" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-dm-sans)' }}>
                  {pendingCount} demande{pendingCount !== 1 ? 's' : ''} de congé{pendingCount !== 1 ? 's' : ''} en attente de validation
                </p>
                <span className="text-[12px] font-medium flex-shrink-0" style={{ color: '#FFB347' }}>Traiter →</span>
              </div>
            </Link>
          )}
          {latenessCount > 0 && (
            <Link href="/manager/presences">
              <div className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-[rgba(255,107,107,0.05)]"
                style={{ backgroundColor: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: '10px' }}
              >
                <Clock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#FF6B6B' }} />
                <p className="flex-1 text-[13px]" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-dm-sans)' }}>
                  {latenessCount} retard{latenessCount !== 1 ? 's' : ''} enregistré{latenessCount !== 1 ? 's' : ''} ce mois
                </p>
                <span className="text-[12px] font-medium flex-shrink-0" style={{ color: '#FF6B6B' }}>Voir →</span>
              </div>
            </Link>
          )}
          {exchangePending > 0 && (
            <Link href="/manager/echanges">
              <div className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-[var(--accent-light)]"
                style={{ backgroundColor: 'var(--accent-light)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '10px' }}
              >
                <ArrowLeftRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                <p className="flex-1 text-[13px]" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-dm-sans)' }}>
                  {exchangePending} échange{exchangePending !== 1 ? 's' : ''} de shift en attente de validation
                </p>
                <span className="text-[12px] font-medium flex-shrink-0" style={{ color: 'var(--accent)' }}>Valider →</span>
              </div>
            </Link>
          )}
          {cddExpiring > 0 && (
            <Link href="/manager/employees">
              <div className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-[rgba(255,179,71,0.05)]"
                style={{ backgroundColor: 'rgba(255,179,71,0.08)', border: '1px solid rgba(255,179,71,0.2)', borderRadius: '10px' }}
              >
                <FileText className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#FFB347' }} />
                <p className="flex-1 text-[13px]" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-dm-sans)' }}>
                  {cddExpiring} contrat{cddExpiring !== 1 ? 's' : ''} arrive{cddExpiring !== 1 ? 'nt' : ''} à échéance sous 30 jours
                </p>
                <span className="text-[12px] font-medium flex-shrink-0" style={{ color: '#FFB347' }}>Gérer →</span>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ── MODULES ───────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-dm-sans)' }}>
          Modules
        </p>

        {/* Planning — module principal */}
        <Link
          href="/manager/planning"
          className="block"
          style={{
            opacity: modulesVisible ? 1 : 0,
            transform: modulesVisible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.4s ease 0ms, transform 0.4s ease 0ms',
          }}
        >
          <div
            onMouseEnter={() => setHoveredModule('/manager/planning')}
            onMouseLeave={() => setHoveredModule(null)}
            style={{
              backgroundColor: 'var(--bg-card)',
              border: `1px solid ${hoveredModule === '/manager/planning' ? '#6C63FF' : 'var(--border)'}`,
              borderRadius: '14px',
              padding: '18px 20px',
              transform: hoveredModule === '/manager/planning' ? 'translateY(-3px)' : 'translateY(0)',
              boxShadow: hoveredModule === '/manager/planning' ? '0 0 0 1px rgba(108,99,255,0.2), 0 10px 30px rgba(16,24,40,0.12), 0 0 40px rgba(108,99,255,0.06)' : '0 1px 3px rgba(16,24,40,0.06)',
              transition: 'all 200ms ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar className="h-5 w-5" style={{ color: '#6C63FF' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>Planning</p>
                    <span style={{
                      fontSize: '10px', padding: '2px 8px', borderRadius: '6px', letterSpacing: '0.04em', fontFamily: 'var(--font-syne)',
                      backgroundColor: 'rgba(108,99,255,0.15)', color: '#6C63FF', border: '1px solid rgba(108,99,255,0.3)',
                    }}>
                      Principal
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'var(--font-dm-sans)' }}>
                    Créez, modifiez et publiez les horaires de votre équipe.
                  </p>
                </div>
              </div>
              <div className="btn-primary flex-shrink-0">
                Ouvrir
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </Link>

        {/* Modules secondaires */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SECONDARY_MODULES.map(({ title, description, icon: Icon, href, accentColor, accentBg }, idx) => {
            const badge = href === '/manager/conges' ? pendingCount : 0
            const delay = (idx + 1) * 60
            return (
              <Link
                key={href}
                href={href}
                className="block"
                style={{
                  opacity: modulesVisible ? 1 : 0,
                  transform: modulesVisible ? 'translateY(0)' : 'translateY(12px)',
                  transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
                }}
              >
                <div
                  onMouseEnter={() => setHoveredModule(href)}
                  onMouseLeave={() => setHoveredModule(null)}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: `1px solid ${hoveredModule === href ? '#6C63FF' : 'var(--border)'}`,
                    borderRadius: '14px',
                    padding: '18px 20px',
                    height: '100%',
                    transform: hoveredModule === href ? 'translateY(-3px)' : 'translateY(0)',
                    boxShadow: hoveredModule === href ? '0 0 0 1px rgba(108,99,255,0.2), 0 10px 30px rgba(16,24,40,0.12), 0 0 40px rgba(108,99,255,0.06)' : '0 1px 3px rgba(16,24,40,0.06)',
                    transition: 'all 200ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon className="h-4 w-4" style={{ color: accentColor }} />
                    </div>
                    {badge > 0 && (
                      <span style={{ backgroundColor: 'rgba(255,179,71,0.15)', color: '#FFB347', borderRadius: '6px', fontSize: '10px', fontWeight: 500, padding: '2px 6px', lineHeight: '16px' }}>
                        {badge}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>{title}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'var(--font-dm-sans)' }}>{description}</p>
                  <div style={{
                    marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '12px', fontWeight: 500, color: '#6C63FF',
                    opacity: hoveredModule === href ? 1 : 0,
                    transition: 'opacity 150ms ease',
                  }}>
                    Accéder <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

    </div>
  )
}
