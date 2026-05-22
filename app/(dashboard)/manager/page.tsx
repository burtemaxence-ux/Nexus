import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, FileText, Clock, Settings } from 'lucide-react'

async function signOut() {
  'use server'
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function ManagerDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const fullName = user.user_metadata?.full_name as string | undefined
  const firstName = fullName?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Manager'

  const navigationCards = [
    {
      title: 'Planning',
      description: 'Gérer et visualiser le planning de votre équipe',
      icon: Calendar,
      href: '/manager/planning',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Employés',
      description: 'Gérer les profils et disponibilités de vos employés',
      icon: Users,
      href: '/manager/employees',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Demandes de congés',
      description: 'Consulter et traiter les demandes de congés',
      icon: FileText,
      href: '/manager/conges',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Présences',
      description: 'Suivre les présences et les horaires réels',
      icon: Clock,
      href: '/manager/presences',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Paramètres',
      description: 'Gérer les postes, les couleurs et la configuration du planning',
      icon: Settings,
      href: '/manager/settings/postes',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bonjour {firstName} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Tableau de bord Manager — D-pot
          </p>
        </div>
        <form action={signOut}>
          <Button variant="outline" type="submit">
            Se déconnecter
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {navigationCards.map((card) => {
          const Icon = card.icon
          const isActive = card.href === '/manager/employees' || card.href === '/manager/planning' || card.href === '/manager/settings/postes'
          return isActive ? (
            <Link key={card.title} href={card.href} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {card.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card
              key={card.title}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {card.description}
                </CardDescription>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Disponible prochainement
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
