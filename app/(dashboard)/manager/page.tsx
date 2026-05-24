import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, FileText, Clock, Settings, BarChart3, Building2, ArrowRight } from 'lucide-react'

const cards = [
  { title: 'Planning', description: 'Gérer et visualiser le planning', icon: Calendar, href: '/manager/planning', color: 'text-primary', bg: 'bg-primary/10' },
  { title: 'Employés', description: 'Gérer les profils et contrats', icon: Users, href: '/manager/employees', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { title: 'Rapport', description: 'Synthèse horaire par employé', icon: BarChart3, href: '/manager/rapport', color: 'text-violet-600', bg: 'bg-violet-50' },
  { title: 'Congés', description: 'Traiter les demandes de congés', icon: FileText, href: '/manager/conges', color: 'text-amber-600', bg: 'bg-amber-50' },
  { title: 'Présences', description: 'Suivre les horaires réels', icon: Clock, href: '/manager/presences', color: 'text-rose-600', bg: 'bg-rose-50' },
  { title: 'Paramètres', description: 'Postes, règles et alertes', icon: Settings, href: '/manager/settings', color: 'text-slate-600', bg: 'bg-slate-100' },
]

export default async function ManagerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const firstName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Manager'

  const { data: employees } = await supabase.from('profiles').select('id').eq('role', 'employee').eq('archived', false)
  const { data: pendingLeaves } = await supabase.from('leave_requests').select('id').eq('status', 'pending')
  const { data: nameRow } = await supabase.from('settings').select('value').eq('key', 'establishment_name').maybeSingle()
  const isDefaultName = !nameRow?.value || nameRow.value === 'Mon établissement'

  // Week bounds (Mon–Sun)
  const today = new Date()
  const dow = today.getDay() || 7
  const monday = new Date(today); monday.setDate(today.getDate() - dow + 1)
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  const weekStart = monday.toISOString().split('T')[0]
  const weekEnd   = sunday.toISOString().split('T')[0]
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

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Bonjour {firstName} 👋</h1>
        <p className="text-muted-foreground mt-1">Tableau de bord — D-pot</p>
      </div>

      {/* Setup banner — shown until the establishment is named */}
      {isDefaultName && (
        <Link href="/manager/settings/organisation">
          <div className="mb-6 flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 hover:bg-blue-100 transition-colors">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 shrink-0">
              <Building2 className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900">Configurez votre établissement</p>
              <p className="text-xs text-blue-600 mt-0.5">Ajoutez le nom, l&apos;adresse et le logo pour personnaliser vos exports et emails.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-blue-400 shrink-0" />
          </div>
        </Link>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Employés actifs</p>
            <p className="text-3xl font-bold text-foreground mt-1">{employees?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Congés en attente</p>
            <p className="text-3xl font-bold text-foreground mt-1">{pendingLeaves?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Semaine en cours</p>
            <p className="text-3xl font-bold text-foreground mt-1">S{getCurrentWeek()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shifts cette semaine</p>
            <p className="text-3xl font-bold text-foreground mt-1">{totalShifts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taux présence (semaine)</p>
            <p className={`text-3xl font-bold mt-1 ${presenceRate === null ? 'text-muted-foreground' : presenceRate >= 80 ? 'text-emerald-600' : presenceRate >= 60 ? 'text-amber-600' : 'text-destructive'}`}>
              {presenceRate === null ? '—' : `${presenceRate}%`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Retards ce mois</p>
            <p className={`text-3xl font-bold mt-1 ${latenessCount === 0 ? 'text-foreground' : 'text-orange-600'}`}>
              {latenessCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Nav cards */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Accès rapide</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.title} href={card.href}>
              <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer h-full border-border/60">
                <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-5">
                  <div className={`p-2.5 rounded-xl ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
                </CardHeader>
                <CardContent className="pb-5">
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function getCurrentWeek() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}
