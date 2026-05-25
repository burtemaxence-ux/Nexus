import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { ElementType } from 'react'
import {
  Calendar, Users, FileText, Clock, Settings, BarChart3,
  Building2, ArrowRight, AlertTriangle, TrendingUp,
} from 'lucide-react'

// ── UI sub-components (style only) ────────────────────────────────────────────

interface KpiProps {
  label: string
  value: string
  icon: ElementType
  iconBg: string
  iconColor: string
  valueClass?: string
}

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, valueClass = 'text-[#18181B]' }: KpiProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] px-5 py-5 shadow-[0_1px_4px_0_rgba(0,0,0,0.04)] hover:shadow-[0_3px_12px_0_rgba(0,0,0,0.07)] transition-shadow duration-200">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-4 ${iconBg}`}>
        <Icon className={`h-[17px] w-[17px] ${iconColor}`} />
      </div>
      <p className={`text-[28px] font-bold leading-none tracking-tight ${valueClass}`}>{value}</p>
      <p className="text-[11px] font-semibold text-[#9CA3AF] mt-2 uppercase tracking-[0.08em] leading-tight">{label}</p>
    </div>
  )
}

interface NavCardProps {
  title: string
  description: string
  icon: ElementType
  href: string
  iconBg: string
  iconColor: string
}

function NavCard({ title, description, icon: Icon, href, iconBg, iconColor }: NavCardProps) {
  return (
    <Link href={href} className="group block h-full">
      <div className="h-full bg-white rounded-2xl border border-[#E5E7EB] px-6 py-5 shadow-[0_1px_4px_0_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_0_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <ArrowRight className="h-4 w-4 text-[#D1D5DB] group-hover:text-[#4F46E5] group-hover:translate-x-0.5 transition-all duration-150 mt-0.5 flex-shrink-0" />
        </div>
        <p className="text-[15px] font-semibold text-[#18181B] leading-tight">{title}</p>
        <p className="text-[13px] text-[#6B7280] mt-1.5 leading-snug">{description}</p>
      </div>
    </Link>
  )
}

// ── Nav cards config ───────────────────────────────────────────────────────────

const NAV_CARDS: NavCardProps[] = [
  {
    title: 'Planning',
    description: 'Créez et visualisez les horaires de votre équipe.',
    icon: Calendar,
    href: '/manager/planning',
    iconBg: 'bg-[#4F46E5]/10',
    iconColor: 'text-[#4F46E5]',
  },
  {
    title: 'Employés',
    description: 'Gérez les profils, contrats et rôles.',
    icon: Users,
    href: '/manager/employees',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    title: 'Rapport',
    description: 'Synthèse horaire et analyse des coûts.',
    icon: BarChart3,
    href: '/manager/rapport',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    title: 'Congés',
    description: "Traitez et suivez les demandes d'absence.",
    icon: FileText,
    href: '/manager/conges',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    title: 'Présences',
    description: 'Consultez les horaires réels et pointages.',
    icon: Clock,
    href: '/manager/presences',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
  {
    title: 'Paramètres',
    description: 'Postes, règles, alertes et configuration.',
    icon: Settings,
    href: '/manager/settings',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
  },
]

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ManagerDashboard() {
  // ── Supabase queries — NE PAS MODIFIER ──────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const firstName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Manager'

  const { data: employees }    = await supabase.from('profiles').select('id').eq('role', 'employee').eq('archived', false)
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

  const totalShifts  = weekShifts?.length ?? 0
  const shiftKeys    = new Set((weekShifts ?? []).map(s => `${s.employee_id}_${s.date}`))
  const presentCount = (weekPresences ?? []).filter(p => shiftKeys.has(`${p.employee_id}_${p.date}`)).length
  const presenceRate = totalShifts > 0 ? Math.round(presentCount / totalShifts * 100) : null
  const latenessCount = monthLateness?.length ?? 0
  // ── Fin des données — NE PAS MODIFIER ───────────────────────────────────────

  const pendingCount  = pendingLeaves?.length ?? 0
  const employeeCount = employees?.length ?? 0

  const establishmentLabel = !isDefaultName ? nameRow!.value : null

  const todayLabel = today.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const presenceValueClass = presenceRate === null
    ? 'text-[#6B7280]'
    : presenceRate >= 80 ? 'text-emerald-600'
    : presenceRate >= 60 ? 'text-amber-600'
    : 'text-red-600'

  const presenceIconBg = presenceRate === null
    ? 'bg-[#F3F4F6]'
    : presenceRate >= 80 ? 'bg-emerald-50'
    : presenceRate >= 60 ? 'bg-amber-50'
    : 'bg-red-50'

  const presenceIconColor = presenceRate === null
    ? 'text-[#9CA3AF]'
    : presenceRate >= 80 ? 'text-emerald-600'
    : presenceRate >= 60 ? 'text-amber-600'
    : 'text-red-600'

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        {/* ── SECTION 1 : HEADER ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[28px] font-bold text-[#18181B] tracking-tight leading-tight">
              Bonjour {firstName} 👋
            </h1>
            <p className="text-[14px] text-[#6B7280] mt-1.5 leading-snug">
              {establishmentLabel && (
                <><span className="font-medium text-[#374151]">{establishmentLabel}</span> · </>
              )}
              <span className="capitalize">{todayLabel}</span>
            </p>
          </div>
          <Link
            href="/manager/planning"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4F46E5] text-white text-[13px] font-semibold rounded-xl hover:bg-[#4338CA] active:bg-[#3730A3] transition-colors shadow-[0_2px_6px_0_rgba(79,70,229,0.3)] flex-shrink-0"
          >
            <Calendar className="h-3.5 w-3.5" />
            Voir le planning
          </Link>
        </div>

        {/* ── SECTION 2 : SETUP BANNER (conditionnel) ─────────────────────────── */}
        {isDefaultName && (
          <Link href="/manager/settings/organisation">
            <div className="flex items-center gap-4 rounded-2xl border border-[#4F46E5]/20 bg-[#4F46E5]/[0.04] px-5 py-4 hover:bg-[#4F46E5]/[0.07] transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4F46E5]/10 flex-shrink-0">
                <Building2 className="h-5 w-5 text-[#4F46E5]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[#18181B]">Configurez votre établissement</p>
                <p className="text-[13px] text-[#6B7280] mt-0.5">
                  Ajoutez le nom, l&apos;adresse et le logo pour personnaliser vos exports et emails.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-[#4F46E5]/50 flex-shrink-0" />
            </div>
          </Link>
        )}

        {/* ── SECTION 3 : KPI CARDS ───────────────────────────────────────────── */}
        <div>
          <p className="text-[11px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase mb-3">
            Vue d&apos;ensemble
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              label="Employés actifs"
              value={String(employeeCount)}
              icon={Users}
              iconBg="bg-[#4F46E5]/10"
              iconColor="text-[#4F46E5]"
            />
            <KpiCard
              label="Congés en attente"
              value={String(pendingCount)}
              icon={FileText}
              iconBg={pendingCount > 0 ? 'bg-amber-50' : 'bg-[#F3F4F6]'}
              iconColor={pendingCount > 0 ? 'text-amber-600' : 'text-[#9CA3AF]'}
              valueClass={pendingCount > 0 ? 'text-amber-600' : 'text-[#18181B]'}
            />
            <KpiCard
              label="Présence semaine"
              value={presenceRate === null ? '—' : `${presenceRate}%`}
              icon={TrendingUp}
              iconBg={presenceIconBg}
              iconColor={presenceIconColor}
              valueClass={presenceValueClass}
            />
            <KpiCard
              label="Retards ce mois"
              value={String(latenessCount)}
              icon={Clock}
              iconBg={latenessCount > 0 ? 'bg-rose-50' : 'bg-[#F3F4F6]'}
              iconColor={latenessCount > 0 ? 'text-rose-600' : 'text-[#9CA3AF]'}
              valueClass={latenessCount > 0 ? 'text-rose-600' : 'text-[#18181B]'}
            />
            <KpiCard
              label="Shifts cette semaine"
              value={String(totalShifts)}
              icon={Calendar}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
            />
            <KpiCard
              label="Semaine en cours"
              value={`S${getCurrentWeek()}`}
              icon={BarChart3}
              iconBg="bg-slate-100"
              iconColor="text-slate-500"
            />
          </div>
        </div>

        {/* ── SECTION 4 : ALERTES (conditionnel — disparaît si 0) ─────────────── */}
        {(pendingCount > 0 || latenessCount > 0) && (
          <div>
            <p className="text-[11px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase mb-3">
              Actions requises
            </p>
            <div className="space-y-2.5">

              {pendingCount > 0 && (
                <Link href="/manager/conges">
                  <div className="flex items-center gap-4 bg-amber-50 border border-amber-200/80 rounded-2xl px-5 py-4 hover:bg-amber-100/70 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 flex-shrink-0">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-amber-900">
                        {pendingCount} demande{pendingCount > 1 ? 's' : ''} de congé{pendingCount > 1 ? 's' : ''} en attente
                      </p>
                      <p className="text-[12px] text-amber-700 mt-0.5">
                        Validez ou refusez les demandes de votre équipe.
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  </div>
                </Link>
              )}

              {latenessCount > 0 && (
                <Link href="/manager/presences">
                  <div className="flex items-center gap-4 bg-rose-50 border border-rose-200/80 rounded-2xl px-5 py-4 hover:bg-rose-100/70 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 flex-shrink-0">
                      <Clock className="h-4 w-4 text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-rose-900">
                        {latenessCount} retard{latenessCount > 1 ? 's' : ''} enregistré{latenessCount > 1 ? 's' : ''} ce mois
                      </p>
                      <p className="text-[12px] text-rose-700 mt-0.5">
                        Consultez le détail des présences et pointages.
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-rose-500 flex-shrink-0" />
                  </div>
                </Link>
              )}

            </div>
          </div>
        )}

        {/* ── SECTION 5 : NAV CARDS ───────────────────────────────────────────── */}
        <div>
          <p className="text-[11px] font-bold tracking-[0.1em] text-[#9CA3AF] uppercase mb-3">
            Modules
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NAV_CARDS.map(card => (
              <NavCard key={card.href} {...card} />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getCurrentWeek() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}
