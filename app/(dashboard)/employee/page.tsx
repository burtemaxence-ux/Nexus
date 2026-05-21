import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, FileText, Clock } from 'lucide-react'

async function signOut() {
  'use server'
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function EmployeeDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const fullName = user.user_metadata?.full_name as string | undefined
  const firstName = fullName?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Employé'

  const navigationCards = [
    {
      title: 'Mon planning',
      description: 'Consulter vos horaires et shifts à venir',
      icon: Calendar,
      href: '/employee/planning',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Mes congés',
      description: 'Soumettre et suivre vos demandes de congés',
      icon: FileText,
      href: '/employee/conges',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Badgeuse',
      description: 'Pointer votre arrivée et votre départ',
      icon: Clock,
      href: '/employee/badgeuse',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
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
            Mon espace — D-pot
          </p>
        </div>
        <form action={signOut}>
          <Button variant="outline" type="submit">
            Se déconnecter
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {navigationCards.map((card) => {
          const Icon = card.icon
          return (
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
