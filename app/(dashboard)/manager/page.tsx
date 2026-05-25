import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { ElementType } from 'react'
import {
  Calendar, Users, Clock, Settings, BarChart3,
  Building2, ArrowRight, AlertTriangle, Palmtree,
} from 'lucide-react'

// ── Modules secondaires (config statique) ─────────────────────────────────────

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
    ? { color: 'var(--text-tertiary)', dotColor: 'var(--text-tertiary)', label: 'Aucun shift planifié' }
    : presenceRate >= 80
    ? { color: 'var(--success)',  dotColor: 'var(--success)',  label: 'Bonne présence' }
    : presenceRate >= 60
    ? { color: 'var(--warning)',  dotColor: 'var(--warning)',  label: 'Présence à surveiller' }
    : { color: 'var(--danger)',   dotColor: 'var(--danger)',   label: 'Présence insuffisante' }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── SETUP BANNER ──────────────────────────────────────────────────── */}
        {isDefaultName && (
          <Link href="/manager/settings/organisation">
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors duration-150"
              style={{
                borderColor: 'var(--accent)',
                backgroundColor: 'var(--accent-light)',
              }}
            >
              <Building2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
              <p className="flex-1 text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
                Configurez votre établissement — ajoutez le nom, le logo et l&apos;adresse.
              </p>
              <ArrowRight className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--accent)' }} />
            </div>
          </Link>
        )}

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap pt-1">
          <div>
            <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
              Bonjour {firstName} 👋
            </h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Voici un aperçu de votre activité.
            </p>
            <p className="text-[11px] uppercase tracking-[0.06em] mt-1.5 capitalize" style={{ color: 'var(--text-tertiary)' }}>
              {establishmentLabel
                ? <>{establishmentLabel} · {todayLabel}</>
                : todayLabel
              }
            </p>
          </div>
          <Link href="/manager/planning" className="btn-primary flex-shrink-0">
            <Calendar className="h-3.5 w-3.5" />
            Voir le planning
          </Link>
        </div>

        {/* ── METRIC CARDS ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Card 1 — Présence */}
          <div className="rounded-xl border p-5"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
              borderWidth: '0.5px',
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.06em] mb-4" style={{ color: 'var(--text-tertiary)' }}>
              Présence · Semaine S{getCurrentWeek()}
            </p>

            {/* Metric value */}
            <div className="rounded-[10px] p-3 mb-4 inline-block" style={{ backgroundColor: '#F5F6FA' }}>
              <span className="text-[20px] font-[400] leading-none" style={{ color: presence.color }}>
                {presenceRate === null ? '—' : `${presenceRate}%`}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: presence.dotColor }} />
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{presence.label}</span>
            </div>
            <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                {totalShifts > 0
                  ? `${presentCount} présences sur ${totalShifts} shifts planifiés`
                  : 'Aucun shift planifié pour cette semaine'}
              </p>
            </div>
          </div>

          {/* Card 2 — Équipe */}
          <div className="rounded-xl border p-5"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border)',
              borderWidth: '0.5px',
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.06em] mb-4" style={{ color: 'var(--text-tertiary)' }}>
              Votre équipe
            </p>
            <div className="space-y-3">

              <div className="rounded-[10px] p-3 flex items-center gap-3" style={{ backgroundColor: '#F5F6FA' }}>
                <Users className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-[20px] font-[400] leading-none" style={{ color: 'var(--text-primary)' }}>{employeeCount}</span>
                <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>employés actifs</span>
              </div>

              <div className="rounded-[10px] p-3 flex items-center gap-3" style={{ backgroundColor: '#F5F6FA' }}>
                <Palmtree className="h-3.5 w-3.5 flex-shrink-0" style={{ color: pendingCount > 0 ? 'var(--warning)' : 'var(--text-tertiary)' }} />
                <span className="text-[20px] font-[400] leading-none" style={{ color: pendingCount > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                  {pendingCount}
                </span>
                <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  congé{pendingCount !== 1 ? 's' : ''} en attente
                </span>
              </div>

              <div className="rounded-[10px] p-3 flex items-center gap-3" style={{ backgroundColor: '#F5F6FA' }}>
                <Clock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: latenessCount > 0 ? 'var(--danger)' : 'var(--text-tertiary)' }} />
                <span className="text-[20px] font-[400] leading-none" style={{ color: latenessCount > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {latenessCount}
                </span>
                <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  retard{latenessCount !== 1 ? 's' : ''} ce mois
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* ── ALERTES (conditionnel) ────────────────────────────────────────── */}
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
              style={{
                backgroundColor: 'var(--accent-light)',
                borderColor: 'var(--accent)',
                borderWidth: '0.5px',
              }}
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
                        style={{
                          backgroundColor: 'var(--accent)',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          fontSize: '10px',
                          letterSpacing: '0.04em',
                        }}
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
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border)',
                      borderWidth: '0.5px',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: accentBg }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: accentColor }} />
                      </div>
                      {badge > 0 && (
                        <span className="flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-medium leading-none"
                          style={{
                            backgroundColor: '#FEF3C7',
                            color: 'var(--warning)',
                            borderRadius: '6px',
                          }}
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
