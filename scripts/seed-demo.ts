/**
 * seed-demo.ts — Crée l'environnement démo "La Boulangerie du Soleil"
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   DEMO_USER_EMAIL=demo@quartzbase.fr \
 *   npx tsx scripts/seed-demo.ts
 *
 * Comptes créés :
 *   👔 demo@quartzbase.fr          — Claire Fontaine (manager)
 *   👤 alice.martin@demo.qb.fr     — Boulangère CDI 35h
 *   👤 benoit.dupont@demo.qb.fr    — Boulanger CDI 35h
 *   👤 camille.bernard@demo.qb.fr  — Pâtissière CDI 28h
 *   👤 david.moreau@demo.qb.fr     — Pâtissier CDD
 *   👤 elise.petit@demo.qb.fr      — Vendeuse CDI 35h
 *   👤 francois.simon@demo.qb.fr   — Vendeur CDI 28h
 *   👤 grace.lambert@demo.qb.fr    — Vendeuse Extra
 *   👤 hugo.leroy@demo.qb.fr       — Responsable CDI 39h
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEMO_EMAIL   = process.env.DEMO_USER_EMAIL ?? 'demo@quartzbase.fr'
const DEMO_PASS    = process.env.DEMO_USER_PASSWORD ?? 'Demo2024!Nexus'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function iso(date: Date) { return date.toISOString().split('T')[0] }
function getMonday(d: Date) {
  const day = d.getDay()
  const r = new Date(d)
  r.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return r
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

const TODAY    = new Date()
const MONDAY_0 = getMonday(TODAY)
const MONDAY_M1 = addDays(MONDAY_0, -7)
const MONDAY_M2 = addDays(MONDAY_0, -14)
const MONDAY_M3 = addDays(MONDAY_0, -21)

// ── Seed ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seed démo — La Boulangerie du Soleil\n')

  // 1. Manager
  console.log('1/9  Création du manager...')
  const { data: mgrAuth, error: mgrErr } = await sb.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASS,
    email_confirm: true,
    user_metadata: { full_name: 'Claire Fontaine', role: 'manager' },
  })
  if (mgrErr) throw new Error(`Manager: ${mgrErr.message}`)
  const managerId = mgrAuth.user.id
  await sleep(1500)

  const { data: mgrProfile, error: profErr } = await sb
    .from('profiles').select('establishment_id').eq('id', managerId).single()
  if (profErr || !mgrProfile?.establishment_id) throw new Error('Profil manager manquant')
  const estId = mgrProfile.establishment_id as string
  console.log(`   ✅  ${DEMO_EMAIL}  (estId: ${estId})`)

  // 2. Établissement
  console.log('2/9  Configuration établissement...')
  await sb.from('establishments').update({ name: 'La Boulangerie du Soleil' }).eq('id', estId)
  await sb.from('profiles').update({
    full_name: 'Claire Fontaine', first_name: 'Claire', last_name: 'Fontaine',
    phone: '06 11 22 33 44', position: 'Directrice', contract_type: 'CDI 35h', weekly_hours: 35,
  }).eq('id', managerId)
  await sb.from('settings').upsert([
    { key: 'establishment_name',  value: 'La Boulangerie du Soleil', establishment_id: estId },
    { key: 'opening_time',        value: '06:00',                    establishment_id: estId },
    { key: 'closing_time',        value: '20:00',                    establishment_id: estId },
    { key: 'break_minutes_limit', value: '30',                       establishment_id: estId },
    { key: 'collective_agreement', value: 'Boulangerie-Pâtisserie artisanale', establishment_id: estId },
  ], { onConflict: 'establishment_id,key' })
  console.log('   ✅  La Boulangerie du Soleil')

  // 3. Postes
  console.log('3/9  Création des postes...')
  const { data: postesRows, error: postesErr } = await sb.from('postes').insert([
    { name: 'Boulanger',    color: '#F59E0B', break_minutes: 30, hourly_cost: 13.50, max_hours_per_day: 10, max_hours_per_week: 48, establishment_id: estId },
    { name: 'Pâtissier',   color: '#EC4899', break_minutes: 30, hourly_cost: 14.00, max_hours_per_day: 10, max_hours_per_week: 48, establishment_id: estId },
    { name: 'Vendeur',     color: '#3B82F6', break_minutes: 20, hourly_cost: 12.00, max_hours_per_day:  8, max_hours_per_week: 35, establishment_id: estId },
    { name: 'Responsable', color: '#059669', break_minutes: 30, hourly_cost: 16.00, max_hours_per_day: 10, max_hours_per_week: 48, establishment_id: estId },
  ]).select()
  if (postesErr) throw new Error(`Postes: ${postesErr.message}`)
  const posteMap: Record<string, string> = {}
  postesRows?.forEach((p: { id: string; name: string }) => { posteMap[p.name] = p.id })
  console.log(`   ✅  ${postesRows?.length} postes`)

  // 4. Employés
  console.log('4/9  Création des 8 employés...')
  type ContractType = 'CDI 35h' | 'CDI 28h' | 'CDI 39h' | 'CDD' | 'Extra'
  const EMPLOYEES: Array<{
    email: string; full: string; first: string; last: string; phone: string
    poste: string; contract: ContractType; hours: number; rate: number
  }> = [
    { email: 'alice.martin@demo.qb.fr',    full: 'Alice Martin',    first: 'Alice',    last: 'Martin',    phone: '06 21 32 43 54', poste: 'Boulanger',    contract: 'CDI 35h', hours: 35, rate: 13.50 },
    { email: 'benoit.dupont@demo.qb.fr',   full: 'Benoît Dupont',   first: 'Benoît',   last: 'Dupont',    phone: '06 32 43 54 65', poste: 'Boulanger',    contract: 'CDI 35h', hours: 35, rate: 13.50 },
    { email: 'camille.bernard@demo.qb.fr', full: 'Camille Bernard', first: 'Camille',  last: 'Bernard',   phone: '06 43 54 65 76', poste: 'Pâtissier',   contract: 'CDI 28h', hours: 28, rate: 14.00 },
    { email: 'david.moreau@demo.qb.fr',    full: 'David Moreau',    first: 'David',    last: 'Moreau',    phone: '06 54 65 76 87', poste: 'Pâtissier',   contract: 'CDD',     hours: 35, rate: 14.00 },
    { email: 'elise.petit@demo.qb.fr',     full: 'Élise Petit',     first: 'Élise',    last: 'Petit',     phone: '06 65 76 87 98', poste: 'Vendeur',     contract: 'CDI 35h', hours: 35, rate: 12.00 },
    { email: 'francois.simon@demo.qb.fr',  full: 'François Simon',  first: 'François', last: 'Simon',     phone: '06 76 87 98 09', poste: 'Vendeur',     contract: 'CDI 28h', hours: 28, rate: 12.00 },
    { email: 'grace.lambert@demo.qb.fr',   full: 'Grace Lambert',   first: 'Grace',    last: 'Lambert',   phone: '06 87 98 09 10', poste: 'Vendeur',     contract: 'Extra',   hours: 24, rate: 12.00 },
    { email: 'hugo.leroy@demo.qb.fr',      full: 'Hugo Leroy',      first: 'Hugo',     last: 'Leroy',     phone: '06 98 09 10 21', poste: 'Responsable', contract: 'CDI 39h', hours: 39, rate: 16.00 },
  ]

  const empIds: Record<string, string> = {}

  for (const emp of EMPLOYEES) {
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email: emp.email, password: 'Demo2024!',
      email_confirm: true,
      user_metadata: { full_name: emp.full, role: 'employee', establishment_id: estId },
    })
    if (authErr) throw new Error(`Employee (${emp.email}): ${authErr.message}`)
    empIds[emp.email] = authData.user.id
    await sleep(600)

    await sb.from('profiles').update({
      full_name: emp.full, first_name: emp.first, last_name: emp.last,
      phone: emp.phone, position: emp.poste,
      contract_type: emp.contract, weekly_hours: emp.hours,
      establishment_id: estId, role: 'employee',
    }).eq('id', authData.user.id)
  }
  console.log(`   ✅  8 employés`)

  // 5. Contrats
  console.log('5/9  Création des contrats...')
  const today = iso(TODAY)
  const contractRows = EMPLOYEES.map(emp => {
    const empId = empIds[emp.email]
    const isCdd = emp.contract === 'CDD'
    return {
      employee_id: empId, establishment_id: estId,
      type: emp.contract, weekly_hours: emp.hours, hourly_rate: emp.rate,
      start_date: iso(addDays(TODAY, -90)),
      end_date: isCdd ? iso(addDays(TODAY, 45)) : null,
      trial_period_days: emp.contract.startsWith('CDI') ? 60 : null,
    }
  })
  await sb.from('contracts').insert(contractRows)
  console.log('   ✅  8 contrats')

  // 6. Planning (semaine en cours + 3 semaines historique)
  console.log('6/9  Création du planning...')

  // Patterns boulangerie : postes par employé par jour (offset depuis lundi)
  type ShiftTpl = { day: number; start: string; end: string; brk: number; poste: string }
  const PATTERNS: Record<string, ShiftTpl[]> = {
    'alice.martin@demo.qb.fr': [
      { day: 1, start: '04:00', end: '12:00', brk: 30, poste: 'Boulanger' },
      { day: 2, start: '04:00', end: '12:00', brk: 30, poste: 'Boulanger' },
      { day: 3, start: '04:00', end: '12:00', brk: 30, poste: 'Boulanger' },
      { day: 5, start: '04:00', end: '12:00', brk: 30, poste: 'Boulanger' },
      { day: 6, start: '04:00', end: '12:00', brk: 30, poste: 'Boulanger' },
    ],
    'benoit.dupont@demo.qb.fr': [
      { day: 1, start: '05:00', end: '13:00', brk: 30, poste: 'Boulanger' },
      { day: 2, start: '05:00', end: '13:00', brk: 30, poste: 'Boulanger' },
      { day: 4, start: '05:00', end: '13:00', brk: 30, poste: 'Boulanger' },
      { day: 5, start: '05:00', end: '13:00', brk: 30, poste: 'Boulanger' },
      { day: 7, start: '05:00', end: '13:00', brk: 30, poste: 'Boulanger' },
    ],
    'camille.bernard@demo.qb.fr': [
      { day: 2, start: '06:00', end: '13:00', brk: 30, poste: 'Pâtissier' },
      { day: 3, start: '06:00', end: '13:00', brk: 30, poste: 'Pâtissier' },
      { day: 5, start: '06:00', end: '13:00', brk: 30, poste: 'Pâtissier' },
      { day: 6, start: '06:00', end: '14:00', brk: 30, poste: 'Pâtissier' },
    ],
    'david.moreau@demo.qb.fr': [
      { day: 1, start: '06:00', end: '14:00', brk: 30, poste: 'Pâtissier' },
      { day: 3, start: '06:00', end: '14:00', brk: 30, poste: 'Pâtissier' },
      { day: 4, start: '06:00', end: '14:00', brk: 30, poste: 'Pâtissier' },
      { day: 6, start: '06:00', end: '14:00', brk: 30, poste: 'Pâtissier' },
      { day: 7, start: '06:00', end: '14:00', brk: 30, poste: 'Pâtissier' },
    ],
    'elise.petit@demo.qb.fr': [
      { day: 1, start: '08:00', end: '16:00', brk: 30, poste: 'Vendeur' },
      { day: 2, start: '08:00', end: '16:00', brk: 30, poste: 'Vendeur' },
      { day: 3, start: '08:00', end: '16:00', brk: 30, poste: 'Vendeur' },
      { day: 4, start: '08:00', end: '16:00', brk: 30, poste: 'Vendeur' },
      { day: 6, start: '08:00', end: '16:00', brk: 30, poste: 'Vendeur' },
    ],
    'francois.simon@demo.qb.fr': [
      { day: 2, start: '12:00', end: '20:00', brk: 30, poste: 'Vendeur' },
      { day: 4, start: '12:00', end: '20:00', brk: 30, poste: 'Vendeur' },
      { day: 5, start: '12:00', end: '20:00', brk: 30, poste: 'Vendeur' },
      { day: 7, start: '08:00', end: '14:00', brk: 20, poste: 'Vendeur' },
    ],
    'grace.lambert@demo.qb.fr': [
      { day: 6, start: '08:00', end: '14:00', brk: 20, poste: 'Vendeur' },
      { day: 7, start: '08:00', end: '14:00', brk: 20, poste: 'Vendeur' },
    ],
    'hugo.leroy@demo.qb.fr': [
      { day: 1, start: '07:00', end: '17:00', brk: 60, poste: 'Responsable' },
      { day: 2, start: '07:00', end: '17:00', brk: 60, poste: 'Responsable' },
      { day: 3, start: '07:00', end: '17:00', brk: 60, poste: 'Responsable' },
      { day: 4, start: '07:00', end: '17:00', brk: 60, poste: 'Responsable' },
      { day: 5, start: '07:00', end: '17:00', brk: 60, poste: 'Responsable' },
    ],
  }

  const shiftsToInsert: object[] = []

  for (const [monday, statusVal] of [
    [MONDAY_M3, 'published'], [MONDAY_M2, 'published'],
    [MONDAY_M1, 'published'], [MONDAY_0,  'published'],
  ] as [Date, string][]) {
    for (const [email, tpls] of Object.entries(PATTERNS)) {
      const empId = empIds[email]
      if (!empId) continue
      for (const t of tpls) {
        const shiftDate = addDays(monday, t.day - 1)
        shiftsToInsert.push({
          employee_id: empId, establishment_id: estId,
          date: iso(shiftDate),
          start_time: t.start, end_time: t.end,
          break_minutes: t.brk,
          poste_id: posteMap[t.poste] ?? null,
          status: statusVal,
        })
      }
    }
  }

  await sb.from('shifts').insert(shiftsToInsert)
  console.log(`   ✅  ${shiftsToInsert.length} shifts (4 semaines)`)

  // 7. Congés (2 demandes)
  console.log('7/9  Création des congés...')
  const [aliceId, eliseId] = [empIds['alice.martin@demo.qb.fr'], empIds['elise.petit@demo.qb.fr']]
  await sb.from('leave_requests').insert([
    {
      employee_id: aliceId, establishment_id: estId,
      type: 'CP',
      start_date: iso(addDays(TODAY, 14)),
      end_date:   iso(addDays(TODAY, 21)),
      status: 'pending',
      reason: 'Vacances d\'été',
    },
    {
      employee_id: eliseId, establishment_id: estId,
      type: 'CP',
      start_date: iso(addDays(TODAY, -10)),
      end_date:   iso(addDays(TODAY, -7)),
      status: 'approved',
      reason: 'Long week-end',
    },
  ])
  console.log('   ✅  2 demandes de congés')

  // 8. Alertes conformité (2 : 1 WARNING + 1 CRITICAL)
  console.log('8/9  Création des alertes conformité...')
  const davidId = empIds['david.moreau@demo.qb.fr']
  await sb.from('compliance_alerts').insert([
    {
      establishment_id: estId, employee_id: davidId,
      type: 'cdd_ending', level: 'WARNING',
      title: 'Fin de CDD — David Moreau',
      message: 'Le contrat CDD de David Moreau se termine dans 45 jours. Décision de renouvellement ou de fin de contrat à prendre rapidement.',
      status: 'active', options: { days_remaining: 45 },
    },
    {
      establishment_id: estId, employee_id: aliceId,
      type: 'hours_exceeded', level: 'CRITICAL',
      title: 'Dépassement heures — Alice Martin',
      message: 'Alice Martin dépasse régulièrement ses 35h contractuelles depuis 8 semaines. Risque de requalification si la situation persiste.',
      status: 'active', options: { consecutive_weeks: 8, avg_hours: 40.5, contract_hours: 35 },
    },
  ])
  console.log('   ✅  2 alertes conformité')

  // 9. Notifications (5 non lues pour le manager)
  console.log('9/9  Création des notifications...')
  await sb.from('notifications').insert([
    { user_id: managerId, establishment_id: estId, type: 'leave_request',    title: 'Nouvelle demande de congés', body: 'Alice Martin demande des congés du 14 au 21.', read: false, action_url: '/manager/conges' },
    { user_id: managerId, establishment_id: estId, type: 'compliance_alert', title: 'Alerte conformité CRITICAL', body: 'Dépassement heures — Alice Martin depuis 8 semaines.', read: false, action_url: '/manager/alertes' },
    { user_id: managerId, establishment_id: estId, type: 'compliance_alert', title: 'Alerte conformité WARNING',  body: 'CDD David Moreau se termine dans 45 jours.', read: false, action_url: '/manager/alertes' },
    { user_id: managerId, establishment_id: estId, type: 'shift_swap',       title: 'Échange de planning',        body: 'Benoît Dupont propose un échange de shift à Grace Lambert.', read: false, action_url: '/manager/echanges' },
    { user_id: managerId, establishment_id: estId, type: 'system',           title: 'Planning publié',            body: 'Le planning de la semaine a été publié avec succès.', read: false, action_url: '/manager/planning' },
  ])
  console.log('   ✅  5 notifications')

  console.log(`\n🎉  Seed terminé !`)
  console.log(`\n📋  À copier dans .env.local :`)
  console.log(`   DEMO_USER_EMAIL=${DEMO_EMAIL}`)
  console.log(`   DEMO_ESTABLISHMENT_ID=${estId}\n`)
}

main().catch(err => {
  console.error('❌', err)
  process.exit(1)
})
