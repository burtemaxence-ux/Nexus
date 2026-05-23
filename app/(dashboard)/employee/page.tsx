import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, FileText, Clock } from 'lucide-react'

const cards = [
  {
    title: 'Mon planning',
    description: 'Consulter vos horaires et shifts à venir',
    icon: Calendar,
    href: '/employee/planning',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    title: 'Mes congés',
    description: 'Soumettre et suivre vos demandes de congés',
    icon: FileText,
    href: '/employee/conges',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    title: 'Badgeuse',
    description: 'Pointer votre arrivée et votre départ',
    icon: Clock,
    href: '/employee/badgeuse',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
]

export default async function EmployeeDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const firstName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Employé'

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Bonjour {firstName} 👋</h1>
        <p className="text-muted-foreground mt-1">Mon espace — D-pot</p>
      </div>

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
