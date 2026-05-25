import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { ElementType } from 'react'
import {
  Calendar, Users, FileText, Clock, Settings, BarChart3,
  Building2, ArrowRight, AlertTriangle, Palmtree,
} from 'lucide-react'

// ── Modules secondaires (config statique) ─────────────────────────────────────

interface ModuleConfig {
  title: string
  description: string
  icon: ElementType
  href: string
  iconBg: string
  iconColor: string
}

const SECONDARY_MODULES: ModuleConfig[] = [
  {
    title: 'Employés',
    description: 'Profils, contrats et rôles.',
    icon: Users,
    href: '/manager/employees',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    title: 'Rapport',
    description: 'Synthèse horaire et coûts.',
    icon: BarChart3,
    href: '/manager/rapport',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    title: 'Congés',
    description: "Demandes et soldes d'absence.",
    icon: Palmtree,
    href: '/manager/conges',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    title: 'Présences',
    description: 'Horaires réels et pointages.',
    icon: Clock,
    href: '/manager/presences',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
  {
    title: 'Paramètres',
    description: 'Configuration et règles.',
    icon: Settings,
    href: '/manager/settings',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ManagerDashboard() {

  // ── Supabase — NE PAS MODIFIER ───────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const firstName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Manager'

  const { data: employees }     = await supabase.from('profiles').select('id').eq('role', 'employee').eq('archived', false)
  const { data: pendingLeaves } = await supabase.from('leave_requests').select('id').eq('status', 'pending')
  const { data: nameRow }       = await supabase.from('settings').select('value').eq('key', 'establishment_name').maybeSingle()
  const isDefaultName = !nameRow?.value || nameRow.value === 'Mon établissement'

  const today    = new Date()
  const dow      = today.getDay() || 7
  const monday   = new Date(today); monday.setDate(today.getDate() - dow + 1)
  const sunday   = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const weekStart  = monday.toISOString().split('T')[0]
  const weekEnd    = sunday.toISOString().split('T')[0]
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

  const [{ data: weekShifts }, { data: weekPresences }, { data: monthLateness }] = await Promise.all([
    supabase.from('shifts').select('employee_id, date').gte('date', weekStart).lte('date', weekEnd).is('deleted_at', null),
    supabase.from('presences').select('employee_id, date').gte('date', weekStart).lte('date', weekEnd).not('clock_in', 'is', null),
    supabase.from('lateness_records').select('id').gte('date', monthStart),
  ])

  const totalShifts   = weekShifts?.length ?? 0
  const shiftKeys     = new Set((weekShifts ?? []).map(s => `${s.employee_id}_${s.date}`))
  const presentCount  = (weekPresences ?? []).filter(p => shiftKeys.has(`${p.employee_id}_${p.date}`)).length
  const presenceRate  = totalShifts > 0 ? Math.round(presentCount / totalShifts * 100) : null
  const latenessCount = monthLateness?.length ?? 0
  // ── Fin Supabase ─────────────────────────────────────────────────────────────

  const pendingCount  = pendingLeaves?.length ?? 0
  const employeeCount = employees?.length ?? 0
  const establishmentLabel = !isDefaultName ? nameRow!.value : null

  const todayLabel = today.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // Statut présence
  const presence = presenceRate === null
    ? { valueColor: 'text-[#9CA3AF]', dotColor: 'bg-[#D1D5DB]', label: 'Aucun shift planifié' }
    : presenceRate >= 80
    ? { valueColor: 'text-emerald-600', dotColor: 'bg-emerald-500', label: 'Bonne présence' }
    : presenceRate >= 60
    ? { valueColor: 'text-amber-600',   dotColor: 'bg-amber-500',   label: 'Présence à surveiller' }
    : { valueColor: 'text-red-600',     dotColor: 'bg-red-500',     label: 'Présence insuffisante' }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">

        {/* ── SETUP BANNER ──────────────────────────────────────────────────── */}
        {isDefaultName && (
          <Link href="/manager/settings/organisation">
            <div className="flex items-center gap-3 rounded-xl border border-[#4F46E5]/20 bg-[#4F46E5]/[0.04] px-5 py-3 hover:bg-[#4F46E5]/[0.07] transition-colors">
              <Building2 className="h-4 w-4 text-[#4F46E5] flex-shrink-0" />
              <p className="flex-1 text-[13px] text-[#4F46E5] font-medium">
                Configurez votre établissement — ajoutez le nom, le logo et l&apos;adresse.
              </p>
              <ArrowRight className="h-3.5 w-3.5 text-[#4F46E5]/40 flex-shrink-0" />
            </div>
          </Link>
        )}

        {/* ── SECTION 1 : HERO HEADER ───────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap pt-2">
          <div>
            <h1 className="text-[32px] font-bold text-[#18181B] tracking-tight leading-tight">
              Bonjour {firstName} 👋
            </h1>
            <p className="text-[14px] text-[#6B7280] mt-1.5">
              Voici un aperçu de votre activité aujourd&apos;hui.
            </p>
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-widest mt-2">
              {establishmentLabel
                ? <>{establishmentLabel} · <span className="capitalize">{todayLabel}</span></>
                : <span className="capitalize">{todayLabel}</span>
              }
            </p>
          </div>
          <Link
            href="/manager/planning"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4F46E5] text-white text-[13px] font-semibold rounded-xl hover:bg-[#4338CA] active:bg-[#3730A3] transition-colors shadow-[0_2px_8px_0_rgba(79,70,229,0.28)] flex-shrink-0"
          >
            <Calendar className="h-3.5 w-3.5" />
            Voir le planning
          </Link>
        </div>

        {/* ── SECTION 2 : HERO STATUS CARDS ────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Card 1 — Présence */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] px-7 py-6 shadow-[0_1px_4px_0_rgba(0,0,0,0.04)]">
            <p className="text-[11px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase mb-5">
              Présence · Semaine S{getCurrentWeek()}
            </p>
            <div className="flex items-end gap-3 mb-3">
              <span className={`text-[56px] font-bold leading-none tracking-tight ${presence.valueColor}`}>
                {presenceRate === null ? '—' : `${presenceRate}%`}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${presence.dotColor}`} />
              <span className="text-[13px] text-[#6B7280] font-medium">{presence.label}</span>
            </div>
            <div className="pt-4 border-t border-[#F3F4F6]">
              <p className="text-[12px] text-[#9CA3AF]">
                {totalShifts > 0
                  ? `${presentCount} présences sur ${totalShifts} shifts planifiés`
                  : 'Aucun shift planifié pour cette semaine'}
              </p>
            </div>
          </div>

          {/* Card 2 — Équipe */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] px-7 py-6 shadow-[0_1px_4px_0_rgba(0,0,0,0.04)]">
            <p className="text-[11px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase mb-5">
              Votre équipe
            </p>
            <div className="space-y-5">

              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-[#4F46E5]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[26px] font-bold text-[#18181B] leading-none">{employeeCount}</span>
                  <span className="text-[13px] text-[#6B7280]">employés actifs</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${pendingCount > 0 ? 'bg-amber-50' : 'bg-[#F3F4F6]'}`}>
                  <Palmtree className={`h-4 w-4 ${pendingCount > 0 ? 'text-amber-600' : 'text-[#9CA3AF]'}`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-[26px] font-bold leading-none ${pendingCount > 0 ? 'text-amber-600' : 'text-[#18181B]'}`}>{pendingCount}</span>
                  <span className="text-[13px] text-[#6B7280]">congé{pendingCount !== 1 ? 's' : ''} en attente</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${latenessCount > 0 ? 'bg-rose-50' : 'bg-[#F3F4F6]'}`}>
                  <Clock className={`h-4 w-4 ${latenessCount > 0 ? 'text-rose-600' : 'text-[#9CA3AF]'}`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-[26px] font-bold leading-none ${latenessCount > 0 ? 'text-rose-600' : 'text-[#18181B]'}`}>{latenessCount}</span>
                  <span className="text-[13px] text-[#6B7280]">retard{latenessCount !== 1 ? 's' : ''} ce mois</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── SECTION 3 : ALERTES (conditionnel — disparaît si 0) ──────────── */}
        {(pendingCount > 0 || latenessCount > 0) && (
          <div className="space-y-2">
            {pendingCount > 0 && (
              <Link href="/manager/conges">
                <div className="flex items-center gap-3.5 bg-amber-50 border border-amber-200/80 rounded-xl px-5 py-3.5 hover:bg-amber-100/70 transition-colors">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <p className="flex-1 text-[13px] font-medium text-amber-900">
                    {pendingCount} demande{pendingCount !== 1 ? 's' : ''} de congé{pendingCount !== 1 ? 's' : ''} en attente de validation
                  </p>
                  <span className="text-[12px] font-semibold text-amber-700 flex-shrink-0">Traiter →</span>
                </div>
              </Link>
            )}
            {latenessCount > 0 && (
              <Link href="/manager/presences">
                <div className="flex items-center gap-3.5 bg-rose-50 border border-rose-200/80 rounded-xl px-5 py-3.5 hover:bg-rose-100/70 transition-colors">
                  <Clock className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <p className="flex-1 text-[13px] font-medium text-rose-900">
                    {latenessCount} retard{latenessCount !== 1 ? 's' : ''} enregistré{latenessCount !== 1 ? 's' : ''} ce mois
                  </p>
                  <span className="text-[12px] font-semibold text-rose-700 flex-shrink-0">Voir →</span>
                </div>
              </Link>
            )}
          </div>
        )}

        {/* ── SECTION 4 : MODULES ───────────────────────────────────────────── */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase">Modules</p>

          {/* Planning — module principal pleine largeur */}
          <Link href="/manager/planning" className="group block">
            <div className="bg-[#4F46E5]/[0.04] border border-[#4F46E5]/20 rounded-2xl px-7 py-5 hover:bg-[#4F46E5]/[0.07] hover:border-[#4F46E5]/30 transition-all duration-200">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-[#4F46E5]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-[#18181B]">Planning</p>
                      <span className="text-[10px] font-bold tracking-wide text-[#4F46E5] bg-[#4F46E5]/10 px-2 py-0.5 rounded-full">
                        Principal
                      </span>
                    </div>
                    <p className="text-[13px] text-[#6B7280] mt-0.5 truncate">
                      Créez, modifiez et publiez les horaires de votre équipe.
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] text-white text-[13px] font-semibold rounded-xl group-hover:bg-[#4338CA] transition-colors flex-shrink-0">
                  Ouvrir
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform duration-150" />
                </div>
              </div>
            </div>
          </Link>

          {/* 5 modules secondaires */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SECONDARY_MODULES.map(({ title, description, icon: Icon, href, iconBg, iconColor }) => {
              const badge = href === '/manager/conges' ? pendingCount : 0
              return (
                <Link key={href} href={href} className="group block">
                  <div className="bg-white rounded-2xl border border-[#E5E7EB] px-5 py-5 shadow-[0_1px_4px_0_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 h-full">
                    <div className="flex items-start justify-between gap-2 mb-3.5">
                      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 ${iconBg}`}>
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      {badge > 0 && (
                        <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none">
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] font-semibold text-[#18181B] leading-tight">{title}</p>
                    <p className="text-[12px] text-[#6B7280] mt-1 leading-snug">{description}</p>
                    <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-[#C4C9D4] group-hover:text-[#4F46E5] transition-colors">
                      Accéder <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform duration-150" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Helper ────────────────────────────────────────────────────────────────────

function getCurrentWeek() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}
