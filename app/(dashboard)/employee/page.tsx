import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Calendar, FileText, Clock } from 'lucide-react'

const NAV_CARDS = [
  {
    title: 'Mon planning',
    description: 'Consulter vos horaires et shifts à venir',
    icon: Calendar,
    href: '/employee/planning',
  },
  {
    title: 'Mes congés',
    description: 'Soumettre et suivre vos demandes de congés',
    icon: FileText,
    href: '/employee/conges',
  },
  {
    title: 'Badgeuse',
    description: 'Pointer votre arrivée et votre départ',
    icon: Clock,
    href: '/employee/badgeuse',
  },
]

export default async function EmployeeDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const firstName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Employé'

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
          Bonjour {firstName}
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Mon espace — D-pot</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {NAV_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.title} href={card.href}>
              <div
                className="rounded-xl p-5 transition-colors duration-150"
                style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: 'var(--accent-light)' }}
                >
                  <Icon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                </div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{card.title}</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{card.description}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
