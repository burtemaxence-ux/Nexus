import { supabaseAdmin } from '@/lib/supabase/admin'

export const DEMO_ESTABLISHMENT_NAME = 'La Boulangerie du Soleil'

export const DEMO_POSTES = [
  { name: 'Boulanger',    color: '#F59E0B', break_minutes: 30 },
  { name: 'Pâtissier',   color: '#EC4899', break_minutes: 30 },
  { name: 'Vendeur',     color: '#3B82F6', break_minutes: 20 },
  { name: 'Responsable', color: '#059669', break_minutes: 30 },
]

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function iso(d: Date) { return d.toISOString().split('T')[0] }

export async function resetDemoData(estId: string): Promise<void> {
  // Supprimer les données transientes dans l'ordre des dépendances FK
  await Promise.all([
    supabaseAdmin.from('notifications').delete().eq('establishment_id', estId),
    supabaseAdmin.from('compliance_alerts').delete().eq('establishment_id', estId),
    supabaseAdmin.from('lateness_records').delete().eq('establishment_id', estId),
  ])
  await Promise.all([
    supabaseAdmin.from('replacement_requests').delete().eq('establishment_id', estId),
    supabaseAdmin.from('leave_requests').delete().eq('establishment_id', estId),
    supabaseAdmin.from('presences').delete().eq('establishment_id', estId),
  ])
  await supabaseAdmin.from('shifts').delete().eq('establishment_id', estId)

  // Réinitialiser le nom de l'établissement
  await supabaseAdmin.from('settings').upsert(
    [{ key: 'establishment_name', value: DEMO_ESTABLISHMENT_NAME, establishment_id: estId }],
    { onConflict: 'establishment_id,key' }
  )

  // Récupérer les employés + manager
  const { data: employees } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('establishment_id', estId)
    .eq('archived', false)

  if (!employees?.length) return

  const managerId = employees.find(e => e.role === 'manager')?.id
  const empList   = employees.filter(e => e.role === 'employee')

  const today = new Date()

  // Shifts semaine en cours
  if (empList.length >= 2) {
    const monday = new Date(today)
    const day = today.getDay()
    monday.setDate(today.getDate() + (day === 0 ? -6 : 1 - day))
    const shifts = []
    for (const emp of empList.slice(0, 6)) {
      for (let d = 0; d < 5; d++) {
        shifts.push({
          employee_id: emp.id, establishment_id: estId,
          date: iso(addDays(monday, d)),
          start_time: '07:00', end_time: '15:00',
          break_minutes: 30, status: 'published',
        })
      }
    }
    await supabaseAdmin.from('shifts').insert(shifts)
  }

  // Réinsérer congés
  if (empList.length >= 2) {
    await supabaseAdmin.from('leave_requests').insert([
      {
        employee_id: empList[0].id, establishment_id: estId,
        type: 'CP',
        start_date: iso(addDays(today, 14)),
        end_date:   iso(addDays(today, 21)),
        status: 'pending',
      },
      {
        employee_id: empList[1].id, establishment_id: estId,
        type: 'CP',
        start_date: iso(addDays(today, -10)),
        end_date:   iso(addDays(today, -7)),
        status: 'approved',
      },
    ])
  }

  // Réinsérer alertes conformité
  if (empList.length >= 2) {
    await supabaseAdmin.from('compliance_alerts').insert([
      {
        establishment_id: estId, employee_id: empList[0].id,
        type: 'hours_exceeded', level: 'CRITICAL',
        title: 'Dépassement heures — employé démo',
        message: 'Cet employé dépasse régulièrement ses heures contractuelles depuis plusieurs semaines.',
        status: 'active', options: {},
      },
      {
        establishment_id: estId, employee_id: empList[1].id,
        type: 'cdd_ending', level: 'WARNING',
        title: 'Fin de CDD — employé démo',
        message: 'Le contrat CDD de cet employé se termine dans 45 jours.',
        status: 'active', options: {},
      },
    ])
  }

  // Réinsérer 5 notifications
  if (managerId) {
    await supabaseAdmin.from('notifications').insert([
      { user_id: managerId, establishment_id: estId, type: 'leave_request',    title: 'Nouvelle demande de congés', body: 'Un employé demande des congés.', read: false, action_url: '/manager/conges' },
      { user_id: managerId, establishment_id: estId, type: 'compliance_alert', title: 'Alerte conformité CRITICAL', body: 'Dépassement heures détecté.',      read: false, action_url: '/manager/alertes' },
      { user_id: managerId, establishment_id: estId, type: 'compliance_alert', title: 'Alerte conformité WARNING',  body: 'Fin de CDD approchante.',          read: false, action_url: '/manager/alertes' },
      { user_id: managerId, establishment_id: estId, type: 'shift_swap',       title: 'Échange de planning',        body: 'Un employé propose un échange.',   read: false, action_url: '/manager/echanges' },
      { user_id: managerId, establishment_id: estId, type: 'system',           title: 'Planning publié',            body: 'Le planning a été publié.',         read: false, action_url: '/manager/planning' },
    ])
  }
}
