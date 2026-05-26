import { createClient } from '@/lib/supabase/server'

export interface ProactiveSuggestion {
  label: string   // chip affiché
  message: string // message envoyé au chat quand cliqué
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ suggestions: [] }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['manager', 'supervisor'].includes(profile.role)) {
    return Response.json({ suggestions: [] })
  }

  const today = new Date().toISOString().split('T')[0]
  const day30ago = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const day7ahead = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [
    { data: latenessRecords },
    { data: pendingLeaves },
    { data: upcomingShifts },
    { data: marketplaceSlots },
    { data: shiftExchanges },
  ] = await Promise.all([
    supabase.from('lateness_records')
      .select('date, late_minutes, justified, profiles(full_name)')
      .gte('date', day30ago)
      .order('date', { ascending: false })
      .limit(50),
    supabase.from('leave_requests')
      .select('id, start_date, profiles(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase.from('shifts')
      .select('date')
      .gt('date', today)
      .lte('date', day7ahead)
      .order('date', { ascending: true }),
    supabase.from('marketplace_slots')
      .select('id, shifts(date, position)')
      .eq('status', 'open')
      .limit(5),
    supabase.from('shift_exchanges')
      .select('id, profiles!shift_exchanges_proposer_id_fkey(full_name)')
      .in('status', ['open', 'pending_approval'])
      .limit(5),
  ])

  const suggestions: ProactiveSuggestion[] = []

  // Retards répétés par employé
  const latenessMap: Record<string, { name: string; count: number; unjustified: number }> = {}
  for (const l of latenessRecords ?? []) {
    const name = (l.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Inconnu'
    if (!latenessMap[name]) latenessMap[name] = { name, count: 0, unjustified: 0 }
    latenessMap[name].count++
    if (!l.justified) latenessMap[name].unjustified++
  }
  const worstLate = Object.values(latenessMap)
    .filter(s => s.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)

  for (const s of worstLate) {
    suggestions.push({
      label: `⚠️ ${s.name} — ${s.count} retard(s) ce mois`,
      message: `${s.name} a accumulé ${s.count} retard(s) dont ${s.unjustified} injustifié(s) ces 30 derniers jours. Peux-tu m'aider à rédiger un avertissement ?`,
    })
  }

  // Jours sous-staffés dans les 7 prochains jours
  const shiftsByDay: Record<string, number> = {}
  for (const s of upcomingShifts ?? []) {
    shiftsByDay[s.date] = (shiftsByDay[s.date] ?? 0) + 1
  }
  const understaffed = Object.entries(shiftsByDay)
    .filter(([, count]) => count < 2)
    .map(([date]) => date)
    .slice(0, 2)

  if (understaffed.length > 0) {
    const dates = understaffed.map(d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })).join(' et ')
    suggestions.push({
      label: `📉 Sous-staffé : ${understaffed.map(d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })).join(', ')}`,
      message: `Le planning est sous-staffé le ${dates}. Quelles options as-tu pour couvrir ces créneaux ?`,
    })
  }

  // Congés en attente
  const pending = pendingLeaves ?? []
  if (pending.length > 0) {
    const names = pending
      .slice(0, 2)
      .map(l => (l.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Un employé')
      .join(', ')
    suggestions.push({
      label: `📋 ${pending.length} congé(s) en attente`,
      message: `Il y a ${pending.length} demande(s) de congé en attente de validation (dont ${names}). Peux-tu m'aider à les analyser ?`,
    })
  }

  // Marketplace ouverts
  const slots = marketplaceSlots ?? []
  if (slots.length > 0) {
    suggestions.push({
      label: `🔄 ${slots.length} créneau(x) sans remplaçant`,
      message: `Il y a ${slots.length} créneau(x) ouvert(s) sur le marketplace sans remplaçant. Comment gérer ça ?`,
    })
  }

  // Échanges en attente
  const exchanges = shiftExchanges ?? []
  if (exchanges.length > 0) {
    suggestions.push({
      label: `🔁 ${exchanges.length} échange(s) à approuver`,
      message: `${exchanges.length} demande(s) d'échange de shift attendent ton approbation. Peux-tu m'aider à décider ?`,
    })
  }

  // Fallback si rien de notable
  if (suggestions.length === 0) {
    suggestions.push(
      { label: '📅 Générer le planning de la semaine', message: 'Génère le planning optimisé pour la semaine prochaine.' },
      { label: '📊 Résumé RH de la semaine', message: "Fais-moi un résumé RH de cette semaine : présences, retards, heures." },
      { label: '⚖️ Vérifier les alertes légales', message: 'Y a-t-il des alertes légales à traiter cette semaine ?' },
    )
  }

  return Response.json({ suggestions: suggestions.slice(0, 4) })
}
