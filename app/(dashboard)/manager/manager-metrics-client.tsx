'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar, Users, Clock, Settings, BarChart3,
  ArrowRight, AlertTriangle, Palmtree,
} from 'lucide-react'
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist'
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
    accentColor: 'var(--success)',
    accentBg: '#DCFCE7',
  },
  {
    title: 'Rapport',
    description: 'Synthèse horaire et coûts.',
    icon: BarChart3,
    href: '/manager/rapport',
    accentColor: 'var(--accent)',
    accentBg: 'var(--accent-light)',
  },
  {
    title: 'Congés',
    description: "Demandes et soldes d'absence.",
    icon: Palmtree,
    href: '/manager/conges',
    accentColor: 'var(--warning)',
    accentBg: '#FEF3C7',
  },
  {
    title: 'Présences',
    description: 'Horaires réels et pointages.',
    icon: Clock,
    href: '/manager/presences',
    accentColor: 'var(--danger)',
    accentBg: '#FEE2E2',
  },
  {
    title: 'Paramètres',
    description: 'Configuration et règles.',
    icon: Settings,
    href: '/manager/settings',
    accentColor: 'var(--text-tertiary)',
    accentBg: 'var(--muted)',
  },
]

function getCurrentWeek() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

interface Metrics {
  employeeCount: number
  pendingCount: number
  presenceRate: number | null
  totalShifts: number
  presentCount: number
  latenessCount: number
  onboardingSteps: { title: string; description: string; done: boolean; href: string; cta: string }[]
  onboardingAllDone: boolean
}

function MetricsSkeleton() {
  return (
    <div className="space-y-6" style={{ minHeight: '560px' }}>
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-[14px] p-5 flex flex-col gap-3" style={{ backgroundColor: '#0f0f16', border: '1px solid rgba(255,255,255,0.06)', minHeight: '170px' }}>
            <div className="w-9 h-9 rounded-[10px] animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            <div className="h-2 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            <div className="h-8 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
            <div className="mt-auto h-[5px] rounded-full" style={{ backgroundColor: 'var(--muted)' }} />
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
  progressPct: number
  subLabel?: string
  isNull?: boolean
}

function KpiCard({ label, value, color, icon: Icon, iconBg, suffix = '', progressPct, subLabel, isNull = false }: KpiCardProps) {
  const animated = useCountUp(value)
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#0f0f16',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '14px',
        padding: '20px 22px',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
        transition: 'all 200ms ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5a5a72', fontFamily: 'var(--font-dm-sans)', margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: '32px', fontWeight: 700, lineHeight: 1, color, fontFamily: 'var(--font-syne)', margin: 0 }}>
        {isNull ? '—' : `${animated}${suffix}`}
      </p>
      {subLabel && (
        <p style={{ fontSize: '12px', color: '#9090a8', margin: 0 }}>{subLabel}</p>
      )}
      <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
        <div style={{ height: '5px', borderRadius: '99px', backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            borderRadius: '99px',
            width: `${Math.min(Math.max(progressPct, 0), 100)}%`,
            backgroundColor: color,
            transition: 'width 700ms ease',
          }} />
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
      const weekStart = monday.toISOString().split('T')[0]
      const weekEnd = sunday.toISOString().split('T')[0]
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

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
      ] = await Promise.all([
        supabase.from('profiles').select('id').eq('role', 'employee').eq('archived', false),
        supabase.from('leave_requests').select('id').eq('status', 'pending'),
        supabase.from('settings').select('value').eq('key', 'establishment_name').maybeSingle(),
        supabase.from('shifts').select('employee_id, date').gte('date', weekStart).lte('date', weekEnd).is('deleted_at', null),
        supabase.from('presences').select('employee_id, date').gte('date', weekStart).lte('date', weekEnd).not('clock_in', 'is', null),
        supabase.from('lateness_records').select('id').gte('date', monthStart),
        supabase.from('shifts').select('id').is('deleted_at', null).limit(1),
        supabase.from('week_status').select('id').eq('published', true).limit(1),
        supabase.from('postes').select('*', { count: 'exact', head: true }),
      ])

      const employeeCount = employees?.length ?? 0
      const pendingCount = pendingLeaves?.length ?? 0
      const totalShifts = weekShifts?.length ?? 0
      const shiftKeys = new Set((weekShifts ?? []).map((s: { employee_id: string; date: string }) => `${s.employee_id}_${s.date}`))
      const presentCount = (weekPresences ?? []).filter((p: { employee_id: string; date: string }) => shiftKeys.has(`${p.employee_id}_${p.date}`)).length
      const presenceRate = totalShifts > 0 ? Math.round(presentCount / totalShifts * 100) : null
      const latenessCount = monthLateness?.length ?? 0
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
        presentCount,
        latenessCount,
        onboardingSteps,
        onboardingAllDone: onboardingSteps.every(s => s.done),
      })
    }

    fetchMetrics()
  }, [])

  if (!metrics) return <MetricsSkeleton />

  const { employeeCount, pendingCount, presenceRate, totalShifts, presentCount, latenessCount, onboardingSteps, onboardingAllDone } = metrics

  const presence = presenceRate === null
    ? { color: '#5a5a72', iconBg: 'rgba(90,90,114,0.15)', label: 'Aucun shift planifié' }
    : presenceRate >= 80
    ? { color: '#00D4AA', iconBg: 'rgba(0,212,170,0.15)', label: 'Bonne présence' }
    : presenceRate >= 50
    ? { color: '#FFB347', iconBg: 'rgba(255,179,71,0.15)', label: 'Présence à surveiller' }
    : { color: '#FF6B6B', iconBg: 'rgba(255,107,107,0.15)', label: 'Présence insuffisante' }

  return (
    <div className="space-y-6">

      {/* ── ONBOARDING ────────────────────────────────────────────────────── */}
      {!onboardingAllDone && (
        <OnboardingChecklist steps={onboardingSteps} />
      )}

      {/* ── KPI CARDS ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label={`Présence · S${getCurrentWeek()}`}
          value={presenceRate ?? 0}
          suffix="%"
          color={presence.color}
          icon={BarChart3}
          iconBg={presence.iconBg}
          progressPct={presenceRate ?? 0}
          subLabel={presence.label}
          isNull={presenceRate === null}
        />
        <KpiCard
          label="Équipe"
          value={employeeCount}
          color="#6C63FF"
          icon={Users}
          iconBg="rgba(108,99,255,0.15)"
          progressPct={Math.min(employeeCount * 5, 100)}
          subLabel="employés actifs"
        />
        <KpiCard
          label="Congés en attente"
          value={pendingCount}
          color="#FFB347"
          icon={Palmtree}
          iconBg="rgba(255,179,71,0.15)"
          progressPct={Math.min(pendingCount * 20, 100)}
          subLabel="demandes"
        />
        <KpiCard
          label="Retards ce mois"
          value={latenessCount}
          color="#FF6B6B"
          icon={Clock}
          iconBg="rgba(255,107,107,0.15)"
          progressPct={Math.min(latenessCount * 10, 100)}
          subLabel="enregistrés"
        />
      </div>

      {/* ── ALERTES ───────────────────────────────────────────────────────── */}
      {(pendingCount > 0 || latenessCount > 0) && (
        <div className="space-y-2">
          {pendingCount > 0 && (
            <Link href="/manager/conges">
              <div className="flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors duration-150"
                style={{ backgroundColor: '#FEF3C7', borderColor: '#D97706', borderWidth: '0.5px' }}
              >
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--warning)' }} />
                <p className="flex-1 text-[13px]" style={{ color: '#92400E' }}>
                  {pendingCount} demande{pendingCount !== 1 ? 's' : ''} de congé{pendingCount !== 1 ? 's' : ''} en attente de validation
                </p>
                <span className="text-[12px] font-medium flex-shrink-0" style={{ color: 'var(--warning)' }}>Traiter →</span>
              </div>
            </Link>
          )}
          {latenessCount > 0 && (
            <Link href="/manager/presences">
              <div className="flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors duration-150"
                style={{ backgroundColor: '#FEE2E2', borderColor: '#DC2626', borderWidth: '0.5px' }}
              >
                <Clock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--danger)' }} />
                <p className="flex-1 text-[13px]" style={{ color: '#991B1B' }}>
                  {latenessCount} retard{latenessCount !== 1 ? 's' : ''} enregistré{latenessCount !== 1 ? 's' : ''} ce mois
                </p>
                <span className="text-[12px] font-medium flex-shrink-0" style={{ color: 'var(--danger)' }}>Voir →</span>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ── MODULES ───────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.06em]" style={{ color: 'var(--text-tertiary)' }}>
          Modules
        </p>

        {/* Planning — module principal */}
        <Link href="/manager/planning" className="group block">
          <div className="rounded-xl border px-5 py-4 transition-colors duration-150"
            style={{ backgroundColor: 'var(--accent-light)', borderColor: 'var(--accent)', borderWidth: '0.5px' }}
          >
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'var(--accent)', opacity: 0.15 + 0.85 }}
                >
                  <Calendar className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>Planning</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md"
                      style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', borderRadius: '6px', fontSize: '10px', letterSpacing: '0.04em' }}
                    >
                      Principal
                    </span>
                  </div>
                  <p className="text-[13px] mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
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
          {SECONDARY_MODULES.map(({ title, description, icon: Icon, href, accentColor, accentBg }) => {
            const badge = href === '/manager/conges' ? pendingCount : 0
            return (
              <Link key={href} href={href} className="group block">
                <div className="rounded-xl border h-full px-4 py-4 transition-colors duration-150"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderWidth: '0.5px' }}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: accentBg }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: accentColor }} />
                    </div>
                    {badge > 0 && (
                      <span className="flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-medium leading-none"
                        style={{ backgroundColor: '#FEF3C7', color: 'var(--warning)', borderRadius: '6px' }}
                      >
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[14px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{title}</p>
                  <p className="text-[12px] mt-1 leading-snug" style={{ color: 'var(--text-secondary)' }}>{description}</p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] transition-colors duration-150"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
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
