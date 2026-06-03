'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Users, Clock, AlertTriangle, Calendar, Plus, ArrowRight,
  TrendingUp, TrendingDown, Palmtree, Activity, UserCheck,
  Timer, Zap, Building2,
} from 'lucide-react'
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist'

// ── Design tokens ─────────────────────────────────────────────────────────────

const ACCENT  = '#6C63FF'
const GREEN   = '#00D4AA'
const RED     = '#FF6B6B'
const YELLOW  = '#FFB347'
const MUTED   = '#6B7280'
const PRIMARY = '#F0F2F8'
const SYNE    = 'var(--font-syne,"Syne",sans-serif)'
const DM      = 'var(--font-dm-sans,"DM Sans",sans-serif)'

// ── Time helpers ──────────────────────────────────────────────────────────────

const DAY_START = 7 * 60   // 07:00 in minutes
const DAY_END   = 23 * 60  // 23:00 in minutes
const DAY_SPAN  = DAY_END - DAY_START

function toMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function barLeft(start: string) {
  return Math.max(0, Math.min(100, ((toMin(start) - DAY_START) / DAY_SPAN) * 100))
}
function barWidth(start: string, end: string) {
  return Math.max(1, Math.min(100 - barLeft(start), ((toMin(end) - toMin(start)) / DAY_SPAN) * 100))
}
function shiftHours(start: string, end: string, brk = 0) {
  return Math.max(0, (toMin(end) - toMin(start) - brk)) / 60
}
function isLateNow(startTime: string) {
  const now = new Date()
  const [h, m] = startTime.split(':').map(Number)
  return now > new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
}
function getCurrentWeek() {
  const now = new Date()
  const soy = new Date(now.getFullYear(), 0, 1)
  const days = Math.floor((now.getTime() - soy.getTime()) / 86400000)
  return Math.ceil((days + soy.getDay() + 1) / 7)
}
function relTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1)  return "À l'instant"
  if (m < 60) return `Il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Il y a ${h}h`
  return `Il y a ${Math.floor(h / 24)}j`
}

// ── Count-up hook ─────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 800) {
  const [val, setVal] = useState(0)
  const t0  = useRef<number | null>(null)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    t0.current = null
    const tick = (ts: number) => {
      if (!t0.current) t0.current = ts
      const p = Math.min((ts - t0.current) / duration, 1)
      setVal(Math.round(p * target))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration])
  return val
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TodayShift {
  id: string
  employee_id: string
  start_time: string
  end_time: string
  poste_id: string | null
  employee_name: string
  clocked_in: boolean
}

interface ActivityItem {
  id: string
  label: string
  time: string
  color: string
}

interface DashboardMetrics {
  employeeCount: number
  todayEmployeeCount: number
  weeklyHours: number
  weatherLabel: string
  todayPresenceRate: number | null
  todayPresent: number
  todayShiftCount: number
  alertsTotal: number
  pendingCount: number
  latenessCount: number
  todayShifts: TodayShift[]
  posteColors: Record<string, string>
  recentActivity: ActivityItem[]
  onboardingSteps: { title: string; description: string; done: boolean; href: string; cta: string }[]
  onboardingAllDone: boolean
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-64 rounded-xl mb-2" style={{ backgroundColor: '#111118' }} />
        <div className="h-4 w-44 rounded-lg" style={{ backgroundColor: '#111118' }} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-[14px] h-[140px]"
            style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}
          />
        ))}
      </div>
      <div className="rounded-[14px] h-52"
        style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[14px] h-44"
          style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}
        />
        <div className="rounded-[14px] h-44"
          style={{ backgroundColor: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}
        />
      </div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiProps {
  label: string
  value: number
  displayValue?: string
  suffix?: string
  subValue?: string
  accent?: string
  icon: React.ElementType
  trend?: { label: string; up: boolean } | null
}

function KpiCard({ label, value, displayValue, suffix = '', subValue, accent = ACCENT, icon: Icon, trend }: KpiProps) {
  const animated = useCountUp(value)
  const shown = displayValue ?? `${animated}${suffix}`

  return (
    <div className="card-dark p-5">
      <div className="flex items-start justify-between mb-4">
        <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: MUTED, fontFamily: DM }}>
          {label}
        </p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accent}1A` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-[34px] leading-none font-bold tabular-nums" style={{ color: PRIMARY, fontFamily: SYNE }}>
        {shown}
      </p>
      {subValue && (
        <p className="text-[12px] mt-2 leading-snug" style={{ color: MUTED, fontFamily: DM }}>{subValue}</p>
      )}
      {trend && (
        <div className="mt-3 pt-3 flex items-center gap-1.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {trend.up
            ? <TrendingUp  className="w-3 h-3 flex-shrink-0" style={{ color: GREEN }} />
            : <TrendingDown className="w-3 h-3 flex-shrink-0" style={{ color: RED }} />
          }
          <span className="text-[11px]" style={{ color: trend.up ? GREEN : RED, fontFamily: DM }}>
            {trend.label}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  firstName?: string
  establishmentName?: string | null
}

export function ManagerMetricsClient({ firstName = 'Manager', establishmentName = null }: Props) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)

  // Ensure manager role is set up (idempotent)
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      fetch('/api/auth/set-role', { method: 'POST' })
        .then(r => r.json())
        .then(d => { if (d.role === 'manager' && !d.already_setup) window.location.reload() })
    })
  }, [])

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const today  = new Date()
      const todayS = today.toISOString().split('T')[0]
      const dow    = today.getDay() || 7
      const mon    = new Date(today); mon.setDate(today.getDate() - dow + 1)
      const sun    = new Date(mon);   sun.setDate(mon.getDate() + 6)
      const wStart = mon.toISOString().split('T')[0]
      const wEnd   = sun.toISOString().split('T')[0]
      const mStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

      const [
        { data: employees },
        { data: weekShifts },
        { data: todayRaw },
        { data: todayPresences },
        { data: pendingLeaves },
        { data: monthLateness },
        { data: postes },
        { data: anyShift },
        { data: anyPublished },
        { count: postesCount },
        { data: nameRow },
        { data: recentLeaves },
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name').eq('role', 'employee').eq('archived', false),
        supabase.from('shifts').select('start_time, end_time, break_minutes').gte('date', wStart).lte('date', wEnd).is('deleted_at', null),
        supabase.from('shifts').select('id, employee_id, start_time, end_time, break_minutes, poste_id').eq('date', todayS).is('deleted_at', null).order('start_time'),
        supabase.from('presences').select('employee_id').eq('date', todayS).not('clock_in', 'is', null),
        supabase.from('leave_requests').select('id').eq('status', 'pending'),
        supabase.from('lateness_records').select('id').gte('date', mStart),
        supabase.from('postes').select('id, color'),
        supabase.from('shifts').select('id').is('deleted_at', null).limit(1),
        supabase.from('week_status').select('id').eq('published', true).limit(1),
        supabase.from('postes').select('*', { count: 'exact', head: true }),
        supabase.from('settings').select('value').eq('key', 'establishment_name').maybeSingle(),
        supabase.from('leave_requests').select('id, status, type, updated_at').order('updated_at', { ascending: false }).limit(6),
      ])

      // Counts
      const employeeCount  = employees?.length ?? 0
      const pendingCount   = pendingLeaves?.length ?? 0
      const latenessCount  = monthLateness?.length ?? 0
      const alertsTotal    = pendingCount + latenessCount

      // Weekly hours
      const weeklyHoursN = (weekShifts ?? []).reduce((s, sh) =>
        s + shiftHours(sh.start_time, sh.end_time, sh.break_minutes ?? 0), 0)
      const weeklyHours = Math.round(weeklyHoursN)

      let weatherLabel: string
      if (weeklyHours === 0) weatherLabel = 'Aucune heure planifiée cette semaine'
      else if (weeklyHours < 40) weatherLabel = `Semaine calme — ${weeklyHours}h planifiées`
      else if (weeklyHours < 100) weatherLabel = `Semaine normale — ${weeklyHours}h planifiées`
      else weatherLabel = `Semaine chargée — ${weeklyHours}h planifiées`

      // Today
      const presentIds         = new Set((todayPresences ?? []).map(p => p.employee_id))
      const todayShiftCount    = todayRaw?.length ?? 0
      const todayPresent       = (todayRaw ?? []).filter(s => presentIds.has(s.employee_id)).length
      const todayEmployeeCount = new Set((todayRaw ?? []).map(s => s.employee_id)).size
      const todayPresenceRate  = todayShiftCount > 0
        ? Math.round(todayPresent / todayShiftCount * 100)
        : null

      // Poste colors
      const posteColors: Record<string, string> = {}
      ;(postes ?? []).forEach(p => { if (p.id) posteColors[p.id] = p.color || ACCENT })

      // Enrich today shifts
      const empMap = new Map((employees ?? []).map(e => [e.id, e.full_name ?? 'Employé']))
      const todayShifts: TodayShift[] = (todayRaw ?? []).map(s => ({
        id:            s.id,
        employee_id:   s.employee_id,
        start_time:    s.start_time,
        end_time:      s.end_time,
        poste_id:      s.poste_id,
        employee_name: empMap.get(s.employee_id) ?? 'Employé',
        clocked_in:    presentIds.has(s.employee_id),
      }))

      // Recent activity from leave requests
      const leaveTypes: Record<string, string> = {
        CP: 'Congés payés', RTT: 'RTT', maladie: 'Maladie',
        sans_solde: 'Sans solde', autre: 'Autre',
      }
      const recentActivity: ActivityItem[] = (recentLeaves ?? []).map(l => ({
        id:    l.id,
        label: l.status === 'pending'
          ? `Demande de ${leaveTypes[l.type] ?? l.type} en attente`
          : l.status === 'approved'
          ? `${leaveTypes[l.type] ?? l.type} approuvé`
          : `${leaveTypes[l.type] ?? l.type} refusé`,
        time:  l.updated_at,
        color: l.status === 'pending' ? YELLOW : l.status === 'approved' ? GREEN : RED,
      }))

      // Onboarding steps
      const isDefaultName = !nameRow?.value || nameRow.value === 'Mon établissement'
      const onboardingSteps = [
        { title: 'Nommer votre établissement', description: 'Ajoutez le nom et les informations de votre établissement.', done: !isDefaultName, href: '/manager/settings/organisation', cta: 'Configurer' },
        { title: 'Créer vos postes', description: 'Définissez les rôles de votre équipe (ex. Serveur, Cuisinier).', done: (postesCount ?? 0) > 0, href: '/manager/settings/postes', cta: 'Créer' },
        { title: 'Inviter des employés', description: 'Ajoutez les membres de votre équipe.', done: employeeCount > 0, href: '/manager/employees/new', cta: 'Inviter' },
        { title: 'Créer un premier shift', description: 'Planifiez votre premier horaire dans le planning.', done: (anyShift?.length ?? 0) > 0, href: '/manager/planning', cta: 'Planifier' },
        { title: 'Publier le planning', description: 'Rendez le planning visible pour vos employés.', done: (anyPublished?.length ?? 0) > 0, href: '/manager/planning', cta: 'Publier' },
      ]

      setMetrics({
        employeeCount, todayEmployeeCount, weeklyHours, weatherLabel,
        todayPresenceRate, todayPresent, todayShiftCount,
        alertsTotal, pendingCount, latenessCount,
        todayShifts, posteColors, recentActivity,
        onboardingSteps, onboardingAllDone: onboardingSteps.every(s => s.done),
      })
    }

    load()
  }, [])

  if (!metrics) return <DashboardSkeleton />

  const {
    employeeCount, todayEmployeeCount, weeklyHours, weatherLabel,
    todayPresenceRate, todayPresent, todayShiftCount,
    alertsTotal, pendingCount, latenessCount,
    todayShifts, posteColors, recentActivity,
    onboardingSteps, onboardingAllDone,
  } = metrics

  const week     = getCurrentWeek()
  const todayFR  = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const presColor = todayPresenceRate === null ? MUTED
    : todayPresenceRate >= 80 ? GREEN
    : todayPresenceRate >= 60 ? YELLOW
    : RED

  return (
    <div className="space-y-6">

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ZONE 1 — Header                                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 style={{ fontFamily: SYNE, color: PRIMARY, fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Bonjour {firstName} 👋
            </h1>
            {establishmentName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: `${ACCENT}14`, color: ACCENT, border: `1px solid ${ACCENT}30`, fontFamily: DM }}
              >
                <Building2 className="w-3 h-3" />
                {establishmentName}
              </span>
            )}
          </div>
          <p className="text-[13px] capitalize" style={{ color: MUTED, fontFamily: DM }}>{todayFR}</p>
          <p className="text-[13px] mt-0.5" style={{ color: MUTED, fontFamily: DM }}>{weatherLabel}</p>
        </div>

        <Link href="/manager/planning"
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-white transition-all duration-200"
          style={{ backgroundColor: ACCENT, fontFamily: DM }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#7B73FF'; e.currentTarget.style.boxShadow = `0 4px 20px ${ACCENT}40` }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = ACCENT;     e.currentTarget.style.boxShadow = 'none' }}
        >
          <Calendar className="w-3.5 h-3.5" />
          Voir le planning
        </Link>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Onboarding checklist (hidden when all steps done)                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {!onboardingAllDone && <OnboardingChecklist steps={onboardingSteps} />}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ZONE 2 — KPI Cards                                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Employés ce jour"
          value={todayEmployeeCount}
          subValue={`/ ${employeeCount} dans l'équipe`}
          accent={ACCENT}
          icon={Users}
          trend={todayEmployeeCount > 0 ? { label: "Planifiés aujourd’hui", up: true } : null}
        />
        <KpiCard
          label={`Heures semaine S${week}`}
          value={weeklyHours}
          suffix="h"
          subValue="planifiées cette semaine"
          accent={GREEN}
          icon={Clock}
          trend={weeklyHours > 0 ? { label: 'Semaine en cours', up: true } : null}
        />
        <KpiCard
          label="Présences aujourd'hui"
          value={todayPresenceRate ?? 0}
          displayValue={todayPresenceRate === null ? '—' : undefined}
          suffix={todayPresenceRate !== null ? '%' : ''}
          subValue={todayShiftCount > 0 ? `${todayPresent} présents · ${todayShiftCount} shifts` : 'Aucun shift planifié'}
          accent={presColor}
          icon={UserCheck}
          trend={todayPresenceRate === null ? null : todayPresenceRate >= 80
            ? { label: 'Bonne présence', up: true }
            : { label: 'Présence insuffisante', up: false }
          }
        />
        <KpiCard
          label="Alertes en cours"
          value={alertsTotal}
          subValue={`${pendingCount} congé${pendingCount !== 1 ? 's' : ''} · ${latenessCount} retard${latenessCount !== 1 ? 's' : ''}`}
          accent={alertsTotal > 0 ? RED : GREEN}
          icon={AlertTriangle}
          trend={alertsTotal > 0
            ? { label: 'Nécessite attention', up: false }
            : { label: 'Tout est en ordre', up: true }
          }
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ZONE 3 — Planning du jour                                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="card-dark p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${ACCENT}1A` }}>
              <Timer className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            </div>
            <p className="text-[14px] font-semibold" style={{ color: PRIMARY, fontFamily: SYNE }}>
              Planning du jour
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT, fontFamily: DM }}
            >
              {todayShifts.length} shift{todayShifts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <Link href="/manager/planning"
            className="text-[12px] flex items-center gap-1 transition-colors duration-200"
            style={{ color: MUTED, fontFamily: DM }}
            onMouseEnter={e => { e.currentTarget.style.color = ACCENT }}
            onMouseLeave={e => { e.currentTarget.style.color = MUTED }}
          >
            Voir tout <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {todayShifts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[13px]" style={{ color: MUTED, fontFamily: DM }}>
              {"Aucun shift planifié aujourd'hui"}
            </p>
            <Link href="/manager/planning"
              className="mt-2 inline-flex items-center gap-1.5 text-[12px] transition-colors duration-200"
              style={{ color: ACCENT, fontFamily: DM }}
            >
              <Plus className="w-3.5 h-3.5" />
              Créer un shift
            </Link>
          </div>
        ) : (
          <>
            {/* Time axis */}
            <div className="hidden sm:flex items-center gap-3 mb-3 pl-[108px] pr-[88px]">
              {['7h', '10h', '13h', '16h', '19h', '22h'].map(t => (
                <span key={t} className="flex-1 text-[9px] text-center" style={{ color: '#3A3A4A' }}>{t}</span>
              ))}
            </div>

            {/* Shift rows */}
            <div className="space-y-2">
              {todayShifts.map(shift => {
                const color    = shift.poste_id ? (posteColors[shift.poste_id] ?? ACCENT) : ACCENT
                const present  = shift.clocked_in
                const lateNow  = !present && isLateNow(shift.start_time)

                return (
                  <div key={shift.id} className="flex items-center gap-3">
                    {/* Employee info */}
                    <div className="flex items-center gap-2 flex-shrink-0" style={{ width: '100px' }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={{ backgroundColor: `${color}22`, color }}
                      >
                        {shift.employee_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[12px] truncate" style={{ color: PRIMARY, fontFamily: DM }}>
                        {shift.employee_name.split(' ')[0]}
                      </span>
                    </div>

                    {/* Timeline bar */}
                    <div className="hidden sm:block flex-1 relative h-7 rounded-lg"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                    >
                      <div
                        className="absolute top-1 bottom-1 rounded-md transition-all duration-300"
                        style={{
                          left:            `${barLeft(shift.start_time)}%`,
                          width:           `${barWidth(shift.start_time, shift.end_time)}%`,
                          backgroundColor: present ? color : `${color}55`,
                          boxShadow:       present ? `0 0 8px ${color}40` : 'none',
                        }}
                      />
                    </div>

                    {/* Time — visible on mobile, hidden on desktop */}
                    <span className="sm:hidden text-[11px] flex-1" style={{ color: MUTED, fontFamily: DM }}>
                      {shift.start_time}–{shift.end_time}
                    </span>

                    {/* Status badge */}
                    <div className="flex-shrink-0" style={{ width: '80px', display: 'flex', justifyContent: 'flex-end' }}>
                      {present ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: `${GREEN}1A`, color: GREEN, fontFamily: DM }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: GREEN, animation: 'dp-ping 1.8s cubic-bezier(0,0,0.2,1) infinite' }}
                          />
                          En service
                        </span>
                      ) : lateNow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: `${RED}1A`, color: RED, fontFamily: DM }}
                        >
                          En retard
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px]"
                          style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: MUTED, fontFamily: DM }}
                        >
                          Planifié
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ZONE 4 — Quick actions + Recent activity                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Zone 4A — Actions rapides */}
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${YELLOW}1A` }}>
              <Zap className="w-3.5 h-3.5" style={{ color: YELLOW }} />
            </div>
            <p className="text-[14px] font-semibold" style={{ color: PRIMARY, fontFamily: SYNE }}>
              Actions rapides
            </p>
          </div>

          <div className="space-y-2">
            {/* Créer un shift */}
            <ActionLink
              href="/manager/planning"
              icon={Plus}
              label="Créer un shift"
              accent={ACCENT}
            />

            {/* Valider les congés */}
            <ActionLink
              href="/manager/conges"
              icon={Palmtree}
              label="Valider les congés"
              accent={YELLOW}
              badge={pendingCount > 0 ? pendingCount : undefined}
            />

            {/* Voir les alertes */}
            <ActionLink
              href="/manager/alertes"
              icon={AlertTriangle}
              label="Voir les alertes"
              accent={alertsTotal > 0 ? RED : GREEN}
              badge={alertsTotal > 0 ? alertsTotal : undefined}
            />
          </div>
        </div>

        {/* Zone 4B — Activité récente */}
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${GREEN}1A` }}>
              <Activity className="w-3.5 h-3.5" style={{ color: GREEN }} />
            </div>
            <p className="text-[14px] font-semibold" style={{ color: PRIMARY, fontFamily: SYNE }}>
              Activité récente
            </p>
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-[12px] py-4 text-center" style={{ color: MUTED, fontFamily: DM }}>
              Aucune activité récente
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] leading-snug" style={{ color: PRIMARY, fontFamily: DM }}>
                      {item.label}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: MUTED, fontFamily: DM }}>
                      {relTime(item.time)}
                    </p>
                  </div>
                </div>
              ))}
              <Link href="/manager/conges"
                className="flex items-center gap-1 text-[11px] pt-1 transition-colors duration-200"
                style={{ color: MUTED, fontFamily: DM }}
                onMouseEnter={e => { e.currentTarget.style.color = ACCENT }}
                onMouseLeave={e => { e.currentTarget.style.color = MUTED }}
              >
                Voir tout <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ActionLink helper ─────────────────────────────────────────────────────────

function ActionLink({
  href, icon: Icon, label, accent, badge,
}: {
  href: string
  icon: React.ElementType
  label: string
  accent: string
  badge?: number
}) {
  const [hov, setHov] = useState(false)
  return (
    <Link href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
      style={{
        backgroundColor: hov ? `${accent}12` : `${accent}08`,
        border:          `1px solid ${hov ? `${accent}28` : `${accent}18`}`,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${accent}2A` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
      </div>
      <span className="flex-1 text-[13px]" style={{ color: PRIMARY, fontFamily: DM }}>
        {label}
        {badge !== undefined && (
          <span className="ml-2 inline-flex items-center justify-center text-[10px] px-1.5 py-px rounded-full font-bold"
            style={{ backgroundColor: accent, color: '#0a0a0f' }}
          >
            {badge}
          </span>
        )}
      </span>
      <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200"
        style={{ color: accent, transform: hov ? 'translateX(2px)' : 'translateX(0)' }}
      />
    </Link>
  )
}
