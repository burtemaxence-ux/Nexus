import { createClient } from '@/lib/supabase/server'
import type { ProactiveSuggestion } from '../context/route'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ suggestions: [] }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]
  const day7ahead = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [
    { data: nextShifts },
    { data: myLeaves },
    { data: myLateness },
    { data: openSlots },
  ] = await Promise.all([
    supabase.from('shifts').select('date, start_time, end_time, position').eq('employee_id', user.id).gte('date', today).lte('date', day7ahead).order('date', { ascending: true }).limit(3),
    supabase.from('leave_requests').select('type, start_date, end_date, status').eq('employee_id', user.id).eq('status', 'pending').limit(3),
    supabase.from('lateness_records').select('date, late_minutes').eq('employee_id', user.id).gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]),
    supabase.from('marketplace_slots').select('id, shifts(date, start_time, end_time, position)').eq('status', 'open').limit(3),
  ])

  const suggestions: ProactiveSuggestion[] = []

  // Prochain shift
  if (nextShifts && nextShifts.length > 0) {
    const next = nextShifts[0]
    const dateLabel = new Date(next.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    suggestions.push({
      label: `📅 Prochain shift : ${new Date(next.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })} ${next.start_time}`,
      message: `Dis-moi tout sur mon planning cette semaine et les 7 prochains jours.`,
    })
  } else {
    suggestions.push({
      label: '📅 Mon planning cette semaine',
      message: 'Quels sont mes horaires cette semaine ?',
    })
  }

  // Congés en attente
  if (myLeaves && myLeaves.length > 0) {
    suggestions.push({
      label: `⏳ ${myLeaves.length} congé(s) en attente de validation`,
      message: 'Quel est le statut de mes demandes de congé en cours ?',
    })
  } else {
    suggestions.push({
      label: '🏖️ Mon solde de congés',
      message: "Combien de jours de congés il me reste ? Et comment poser un congé ?",
    })
  }

  // Retards
  if (myLateness && myLateness.length > 0) {
    suggestions.push({
      label: `⚠️ ${myLateness.length} retard(s) ce mois — que faire ?`,
      message: `J'ai eu ${myLateness.length} retard(s) ce mois. Quelles sont les conséquences possibles et comment régulariser la situation ?`,
    })
  } else {
    suggestions.push({
      label: '⚖️ Mes droits (maladie, congés, heures)',
      message: "Quels sont mes droits concernant les arrêts maladie, les congés et les heures supplémentaires ?",
    })
  }

  // Marketplace
  if (openSlots && openSlots.length > 0) {
    suggestions.push({
      label: `🔄 ${openSlots.length} shift(s) disponible(s) à reprendre`,
      message: `Il y a des créneaux disponibles sur le marketplace. Comment postuler pour reprendre un shift ?`,
    })
  }

  return Response.json({ suggestions: suggestions.slice(0, 4) })
}
