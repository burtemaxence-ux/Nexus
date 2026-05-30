/**
 * seed-demo.ts — Crée un environnement de démo complet pour Nexus
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx tsx scripts/seed-demo.ts
 *
 * Comptes créés (mot de passe universel : Demo2024!) :
 *   👔 manager@nexus-demo.fr     — Jean-Pierre Moreau (manager)
 *   👤 marie.dupont@nexus-demo.fr    — Serveuse CDI 35h
 *   👤 thomas.martin@nexus-demo.fr   — Cuisinier CDI 35h
 *   👤 sophie.bernard@nexus-demo.fr  — Serveuse CDI 28h
 *   👤 lucas.petit@nexus-demo.fr     — Plongeur CDD
 *   👤 emma.rousseau@nexus-demo.fr   — Serveuse Extra
 *   👤 antoine.moreau@nexus-demo.fr  — Chef de rang CDI 35h
 */

import { createClient } from '@supabase/supabase-js'
import type { Profile, Shift } from '../types/index'

type EmployeeSeed = {
  key: string; email: string; full: string; first: string; last: string
  phone: string; position: string
  contract: Profile['contract_type']
  hours: number; rate: number
}

type ShiftInsert = Omit<Shift, 'id' | 'notes' | 'created_at'> & { establishment_id: string }

type PresenceInsert = {
  employee_id: string; establishment_id: string; date: string
  clock_in: string; clock_out: string; break_minutes_used: number
}

type LatenessInsert = {
  employee_id: string; establishment_id: string; date: string
  scheduled_time: string; actual_time: string; late_minutes: number
  justified: boolean; notes?: string | null
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Helpers date ──────────────────────────────────────────────────────────────

function d(base: Date, offsetDays = 0): Date {
  const r = new Date(base)
  r.setDate(r.getDate() + offsetDays)
  return r
}

function iso(date: Date): string { return date.toISOString().split('T')[0] }

function getMonday(date: Date): Date {
  const day = date.getDay()
  return d(date, day === 0 ? -6 : 1 - day)
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function addMinToDate(base: Date, dateStr: string, timeStr: string, extraMin: number): Date {
  const [h, m] = timeStr.split(':').map(Number)
  const dt = new Date(`${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00Z`)
  dt.setMinutes(dt.getMinutes() + extraMin)
  return dt
}

// Deterministic pseudo-random (reproducible seed)
let seed = 42
function rand(min: number, max: number): number {
  seed = (seed * 1664525 + 1013904223) & 0xffffffff
  const r = ((seed >>> 0) / 0xffffffff)
  return Math.floor(r * (max - min + 1)) + min
}

// ── Dates de référence ────────────────────────────────────────────────────────

const TODAY       = new Date('2026-05-26T12:00:00Z')
const MONDAY_0    = getMonday(TODAY)            // semaine en cours  : 25/05
const MONDAY_M1   = d(MONDAY_0, -7)             // semaine -1        : 18/05
const MONDAY_M2   = d(MONDAY_0, -14)            // semaine -2        : 11/05
const MONDAY_M3   = d(MONDAY_0, -21)            // semaine -3        : 04/05
const MONDAY_M4   = d(MONDAY_0, -28)            // semaine -4        : 27/04
const MONDAY_P1   = d(MONDAY_0, 7)              // semaine +1        : 01/06

// ── Patterns de shifts ────────────────────────────────────────────────────────
// day: 1=Lun … 7=Dim (offset depuis lundi de la semaine)

type ShiftTpl = { day: number; start: string; end: string; brk: number; poste: string }

const PATTERNS: Record<string, ShiftTpl[]> = {
  MARIE: [
    { day: 2, start: '10:00', end: '15:30', brk:  0, poste: 'Serveur/Serveuse' },
    { day: 3, start: '10:00', end: '15:30', brk:  0, poste: 'Serveur/Serveuse' },
    { day: 4, start: '18:00', end: '23:00', brk:  0, poste: 'Serveur/Serveuse' },
    { day: 5, start: '18:00', end: '23:30', brk: 30, poste: 'Serveur/Serveuse' },
    { day: 6, start: '10:00', end: '23:30', brk: 60, poste: 'Serveur/Serveuse' },
  ],
  THOMAS: [
    { day: 2, start: '08:00', end: '15:00', brk: 30, poste: 'Cuisinier' },
    { day: 3, start: '08:00', end: '15:00', brk: 30, poste: 'Cuisinier' },
    { day: 4, start: '08:00', end: '23:00', brk: 60, poste: 'Cuisinier' },
    { day: 5, start: '08:00', end: '23:30', brk: 60, poste: 'Cuisinier' },
    { day: 6, start: '08:00', end: '23:30', brk: 60, poste: 'Cuisinier' },
    { day: 7, start: '08:00', end: '15:00', brk: 30, poste: 'Cuisinier' },
  ],
  SOPHIE: [
    { day: 2, start: '10:00', end: '15:00', brk:  0, poste: 'Serveur/Serveuse' },
    { day: 5, start: '10:00', end: '15:00', brk:  0, poste: 'Serveur/Serveuse' },
    { day: 6, start: '10:00', end: '15:30', brk:  0, poste: 'Serveur/Serveuse' },
    { day: 7, start: '10:00', end: '15:30', brk:  0, poste: 'Serveur/Serveuse' },
  ],
  LUCAS: [
    { day: 3, start: '10:00', end: '15:30', brk:  0, poste: 'Plongeur' },
    { day: 4, start: '10:00', end: '22:00', brk: 60, poste: 'Plongeur' },
    { day: 5, start: '18:00', end: '23:30', brk:  0, poste: 'Plongeur' },
    { day: 6, start: '10:00', end: '23:30', brk: 60, poste: 'Plongeur' },
    { day: 7, start: '10:00', end: '16:00', brk: 30, poste: 'Plongeur' },
  ],
  EMMA: [
    { day: 5, start: '18:00', end: '23:30', brk:  0, poste: 'Serveur/Serveuse' },
    { day: 6, start: '18:00', end: '23:30', brk:  0, poste: 'Serveur/Serveuse' },
    { day: 7, start: '10:00', end: '15:30', brk:  0, poste: 'Serveur/Serveuse' },
  ],
  ANTOINE: [
    { day: 2, start: '10:00', end: '15:00', brk:  0, poste: 'Chef de rang' },
    { day: 3, start: '10:00', end: '15:00', brk:  0, poste: 'Chef de rang' },
    { day: 4, start: '18:00', end: '23:30', brk:  0, poste: 'Chef de rang' },
    { day: 5, start: '10:00', end: '23:30', brk: 60, poste: 'Chef de rang' },
    { day: 6, start: '10:00', end: '23:30', brk: 60, poste: 'Chef de rang' },
    { day: 7, start: '18:00', end: '23:30', brk:  0, poste: 'Chef de rang' },
  ],
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Démarrage du seed démo Nexus...\n')

  // ── 1. Créer le compte manager ─────────────────────────────────────────────
  console.log('1/10  Création du manager...')
  const { data: mgrAuth, error: mgrErr } = await sb.auth.admin.createUser({
    email: 'manager@nexus-demo.fr',
    password: 'Demo2024!',
    email_confirm: true,
    user_metadata: { full_name: 'Jean-Pierre Moreau', role: 'manager' },
  })
  if (mgrErr) throw new Error(`Manager auth: ${mgrErr.message}`)
  const managerId = mgrAuth.user.id

  // Attendre le trigger
  await sleep(1200)

  const { data: mgrProfile, error: mgrProfErr } = await sb
    .from('profiles')
    .select('establishment_id')
    .eq('id', managerId)
    .single()
  if (mgrProfErr || !mgrProfile?.establishment_id) {
    throw new Error('Profil manager non créé par le trigger')
  }
  const estId = mgrProfile.establishment_id as string
  console.log(`   ✅  Manager: manager@nexus-demo.fr  (estId: ${estId})`)

  // ── 2. Mettre à jour l'établissement + profil manager ─────────────────────
  console.log('2/10  Configuration établissement...')
  await sb.from('establishments').update({ name: 'Le Bistrot Parisien' }).eq('id', estId)
  await sb.from('profiles').update({
    full_name: 'Jean-Pierre Moreau',
    first_name: 'Jean-Pierre',
    last_name: 'Moreau',
    phone: '06 12 34 56 78',
    position: 'Directeur',
    contract_type: 'CDI 35h',
    weekly_hours: 35,
  }).eq('id', managerId)

  await sb.from('settings').upsert([
    { key: 'establishment_name',  value: 'Le Bistrot Parisien',                    establishment_id: estId },
    { key: 'opening_time',        value: '07:00',                                   establishment_id: estId },
    { key: 'closing_time',        value: '23:30',                                   establishment_id: estId },
    { key: 'break_minutes_limit', value: '30',                                      establishment_id: estId },
    { key: 'collective_agreement',value: 'CHR — Convention collective nationale',   establishment_id: estId },
  ])
  console.log('   ✅  Établissement configuré : Le Bistrot Parisien')

  // ── 3. Créer les postes ────────────────────────────────────────────────────
  console.log('3/10  Création des postes...')
  const { data: postesRows, error: postesErr } = await sb.from('postes').insert([
    { name: 'Serveur/Serveuse', color: '#3B82F6', break_minutes: 30, hourly_cost: 12.50, max_hours_per_day: 10, max_hours_per_week: 48, establishment_id: estId },
    { name: 'Cuisinier',        color: '#EF4444', break_minutes: 30, hourly_cost: 14.00, max_hours_per_day: 10, max_hours_per_week: 48, establishment_id: estId },
    { name: 'Plongeur',         color: '#8B5CF6', break_minutes: 20, hourly_cost: 11.88, max_hours_per_day:  8, max_hours_per_week: 35, establishment_id: estId },
    { name: 'Chef de rang',     color: '#059669', break_minutes: 30, hourly_cost: 15.00, max_hours_per_day: 10, max_hours_per_week: 48, establishment_id: estId },
    { name: 'Barman/Barmaid',   color: '#F59E0B', break_minutes: 30, hourly_cost: 13.00, max_hours_per_day: 10, max_hours_per_week: 48, establishment_id: estId },
  ]).select()
  if (postesErr) throw new Error(`Postes: ${postesErr.message}`)
  const posteMap: Record<string, string> = {}
  postesRows?.forEach((p: { id: string; name: string }) => { posteMap[p.name] = p.id })
  console.log(`   ✅  ${postesRows?.length} postes créés`)

  // ── 4. Créer les employés ──────────────────────────────────────────────────
  console.log('4/10  Création des 6 employés...')

  const EMPLOYEES: EmployeeSeed[] = [
    { key: 'MARIE',   email: 'marie.dupont@nexus-demo.fr',    full: 'Marie Dupont',
      first: 'Marie',    last: 'Dupont',   phone: '06 23 45 67 89',
      position: 'Serveur/Serveuse', contract: 'CDI 35h', hours: 35, rate: 12.50 },
    { key: 'THOMAS',  email: 'thomas.martin@nexus-demo.fr',   full: 'Thomas Martin',
      first: 'Thomas',   last: 'Martin',   phone: '06 34 56 78 90',
      position: 'Cuisinier',        contract: 'CDI 35h', hours: 35, rate: 14.00 },
    { key: 'SOPHIE',  email: 'sophie.bernard@nexus-demo.fr',  full: 'Sophie Bernard',
      first: 'Sophie',   last: 'Bernard',  phone: '06 45 67 89 01',
      position: 'Serveur/Serveuse', contract: 'CDI 28h', hours: 28, rate: 12.50 },
    { key: 'LUCAS',   email: 'lucas.petit@nexus-demo.fr',     full: 'Lucas Petit',
      first: 'Lucas',    last: 'Petit',    phone: '06 56 78 90 12',
      position: 'Plongeur',         contract: 'CDD',     hours: 35, rate: 11.88 },
    { key: 'EMMA',    email: 'emma.rousseau@nexus-demo.fr',   full: 'Emma Rousseau',
      first: 'Emma',     last: 'Rousseau', phone: '06 67 89 01 23',
      position: 'Serveur/Serveuse', contract: 'Extra',   hours: 24, rate: 12.50 },
    { key: 'ANTOINE', email: 'antoine.moreau@nexus-demo.fr',  full: 'Antoine Moreau',
      first: 'Antoine',  last: 'Moreau',   phone: '06 78 90 12 34',
      position: 'Chef de rang',     contract: 'CDI 35h', hours: 35, rate: 15.00 },
  ]

  const empIds: Record<string, string> = {}

  for (const emp of EMPLOYEES) {
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email: emp.email,
      password: 'Demo2024!',
      email_confirm: true,
      user_metadata: {
        full_name:        emp.full,
        role:             'employee',
        establishment_id: estId,
      },
    })
    if (authErr) throw new Error(`Employee auth (${emp.email}): ${authErr.message}`)

    empIds[emp.key] = authData.user.id
    await sleep(600)

    await sb.from('profiles').update({
      full_name:     emp.full,
      first_name:    emp.first,
      last_name:     emp.last,
      phone:         emp.phone,
      position:      emp.position,
      contract_type: emp.contract,
      weekly_hours:  emp.hours,
      establishment_id: estId,
    }).eq('id', authData.user.id)

    console.log(`   ✅  ${emp.full.padEnd(22)} → ${emp.email}`)
  }

  // ── 5. Contrats ────────────────────────────────────────────────────────────
  console.log('5/10  Création des contrats...')
  const START_DATE = iso(d(TODAY, -180))
  await sb.from('contracts').insert([
    { employee_id: empIds.MARIE,   establishment_id: estId, type: 'CDI 35h',   start_date: START_DATE, weekly_hours: 35, hourly_rate: 12.50, job_title: 'Serveuse',     paid_leave_days: 25, created_by: managerId },
    { employee_id: empIds.THOMAS,  establishment_id: estId, type: 'CDI 35h',   start_date: START_DATE, weekly_hours: 35, hourly_rate: 14.00, job_title: 'Cuisinier',    paid_leave_days: 25, created_by: managerId },
    { employee_id: empIds.SOPHIE,  establishment_id: estId, type: 'CDI 28h',   start_date: START_DATE, weekly_hours: 28, hourly_rate: 12.50, job_title: 'Serveuse',     paid_leave_days: 25, created_by: managerId },
    { employee_id: empIds.LUCAS,   establishment_id: estId, type: 'CDD',       start_date: START_DATE, end_date: iso(d(TODAY, 90)), weekly_hours: 35, hourly_rate: 11.88, job_title: 'Plongeur', cdd_reason: 'Renfort saisonnier', paid_leave_days: 25, created_by: managerId },
    { employee_id: empIds.EMMA,    establishment_id: estId, type: 'Extra',     start_date: START_DATE, weekly_hours: 24, hourly_rate: 12.50, job_title: 'Serveuse Extra', paid_leave_days: 25, created_by: managerId },
    { employee_id: empIds.ANTOINE, establishment_id: estId, type: 'CDI 35h',   start_date: START_DATE, weekly_hours: 35, hourly_rate: 15.00, job_title: 'Chef de rang', paid_leave_days: 25, created_by: managerId },
  ])
  console.log('   ✅  6 contrats créés')

  // ── 6. Shifts ──────────────────────────────────────────────────────────────
  console.log('6/10  Génération des shifts (5 semaines)...')

  // Sophie était en arrêt maladie semaine -3 (04/05 → 10/05)
  const SOPHIE_SICK_FROM = '2026-05-04'
  const SOPHIE_SICK_TO   = '2026-05-10'

  const weeks: Array<{ monday: Date; status: 'published' | 'draft' }> = [
    { monday: MONDAY_M4, status: 'published' },
    { monday: MONDAY_M3, status: 'published' },
    { monday: MONDAY_M2, status: 'published' },
    { monday: MONDAY_M1, status: 'published' },
    { monday: MONDAY_0,  status: 'published' },
    { monday: MONDAY_P1, status: 'draft'     },
  ]

  const allShifts: ShiftInsert[] = []

  for (const { monday, status } of weeks) {
    for (const [empKey, patterns] of Object.entries(PATTERNS)) {
      const empId = empIds[empKey]
      for (const p of patterns) {
        const shiftDate = iso(d(monday, p.day - 1))

        // Skip Sophie pendant son arrêt maladie
        if (empKey === 'SOPHIE' && shiftDate >= SOPHIE_SICK_FROM && shiftDate <= SOPHIE_SICK_TO) continue

        allShifts.push({
          employee_id:      empId,
          establishment_id: estId,
          date:             shiftDate,
          start_time:       p.start,
          end_time:         p.end,
          break_minutes:    p.brk,
          position:         p.poste,
          poste_id:         posteMap[p.poste],
          status,
        })
      }
    }
  }

  for (let i = 0; i < allShifts.length; i += 200) {
    const { error } = await sb.from('shifts').insert(allShifts.slice(i, i + 200))
    if (error) throw new Error(`Shifts: ${error.message}`)
  }
  console.log(`   ✅  ${allShifts.length} shifts créés`)

  // ── 7. Week status ─────────────────────────────────────────────────────────
  console.log('7/10  Statut des semaines...')
  await sb.from('week_status').upsert(weeks.map(w => ({
    week_monday:      iso(w.monday),
    establishment_id: estId,
    published:        w.status === 'published',
    locked:           false,
    published_at:     w.status === 'published' ? d(w.monday, -1).toISOString() : null,
  })))
  console.log(`   ✅  ${weeks.length} semaines`)

  // ── 8. Présences ───────────────────────────────────────────────────────────
  console.log('8/10  Génération des présences (4 semaines passées)...')

  // Récupérer les shifts publiés passés (avant aujourd'hui)
  const { data: pastShifts, error: psErr } = await sb
    .from('shifts')
    .select('id, employee_id, date, start_time, end_time, break_minutes')
    .eq('establishment_id', estId)
    .eq('status', 'published')
    .gte('date', iso(MONDAY_M4))
    .lt('date', iso(TODAY))
    .order('date', { ascending: true })
  if (psErr) throw new Error(`PastShifts: ${psErr.message}`)

  const presences: PresenceInsert[] = []
  const seen = new Set<string>()

  // Retards déterministes (Emma × 6, Lucas × 3)
  const latenessRecords: LatenessInsert[] = []
  const emmaLateShifts  = new Set<string>()
  const lucasLateShifts = new Set<string>()

  // On choisit à l'avance quels shifts seront en retard
  type PastShiftRow = { id: string; employee_id: string; date: string; start_time: string; end_time: string; break_minutes: number }
  const emmaShifts  = (pastShifts as PastShiftRow[])?.filter(s => s.employee_id === empIds.EMMA)  ?? []
  const lucasShifts = (pastShifts as PastShiftRow[])?.filter(s => s.employee_id === empIds.LUCAS) ?? []

  for (let i = 0; i < Math.min(6, emmaShifts.length);  i++) emmaLateShifts.add(emmaShifts[i * 2 < emmaShifts.length ? i * 2 : i].id)
  for (let i = 0; i < Math.min(3, lucasShifts.length); i++) lucasLateShifts.add(lucasShifts[i * 3 < lucasShifts.length ? i * 3 : i].id)

  for (const shift of pastShifts ?? []) {
    const key = `${shift.employee_id}:${shift.date}`
    if (seen.has(key)) continue
    seen.add(key)

    // 5 % d'absences aléatoires (sauf Emma et Lucas pour ne pas fausser les retards)
    if (shift.employee_id !== empIds.EMMA && shift.employee_id !== empIds.LUCAS) {
      if (rand(0, 19) === 0) continue
    }

    let lateMin = rand(-3, 7) // léger écart normal

    if (emmaLateShifts.has(shift.id)) {
      lateMin = rand(12, 35)
      const scheduledTime = shift.start_time.slice(0, 5)
      latenessRecords.push({
        employee_id:      shift.employee_id,
        establishment_id: estId,
        date:             shift.date,
        scheduled_time:   scheduledTime,
        actual_time:      addMinToDate(TODAY, shift.date, scheduledTime, lateMin).toISOString(),
        late_minutes:     lateMin,
        justified:        latenessRecords.filter(l => l.employee_id === empIds.EMMA).length >= 4,
        notes:            latenessRecords.filter(l => l.employee_id === empIds.EMMA).length >= 4 ? 'Problème de transports en commun' : null,
      })
    }

    if (lucasLateShifts.has(shift.id)) {
      lateMin = rand(15, 30)
      const scheduledTime = shift.start_time.slice(0, 5)
      latenessRecords.push({
        employee_id:      shift.employee_id,
        establishment_id: estId,
        date:             shift.date,
        scheduled_time:   scheduledTime,
        actual_time:      addMinToDate(TODAY, shift.date, scheduledTime, lateMin).toISOString(),
        late_minutes:     lateMin,
        justified:        false,
      })
    }

    const [sh, sm] = shift.start_time.split(':').map(Number)
    const [eh, em] = shift.end_time.split(':').map(Number)

    const clockInDt  = addMinToDate(TODAY, shift.date, shift.start_time.slice(0,5), lateMin)
    const endTimeStr = `${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`
    const clockOutDt = addMinToDate(TODAY, shift.date, endTimeStr, rand(-5, 10))

    // Correction overnight (end < start)
    if (eh < sh || (eh === sh && em < sm)) {
      clockOutDt.setDate(clockOutDt.getDate() + 1)
    }

    presences.push({
      employee_id:       shift.employee_id,
      establishment_id:  estId,
      date:              shift.date,
      clock_in:          clockInDt.toISOString(),
      clock_out:         clockOutDt.toISOString(),
      break_minutes_used: shift.break_minutes > 0 ? shift.break_minutes : 0,
    })
  }

  for (let i = 0; i < presences.length; i += 200) {
    const { error } = await sb.from('presences').insert(presences.slice(i, i + 200))
    if (error) console.warn(`   ⚠️  Présences chunk ${i}: ${error.message}`)
  }
  console.log(`   ✅  ${presences.length} présences créées`)

  // ── 9. Retards ─────────────────────────────────────────────────────────────
  console.log('9/10  Enregistrement des retards...')
  if (latenessRecords.length > 0) {
    const { error } = await sb.from('lateness_records').insert(latenessRecords)
    if (error) console.warn(`   ⚠️  Lateness: ${error.message}`)
  }
  console.log(`   ✅  ${latenessRecords.length} retards (Emma ×${Array.from(emmaLateShifts).length}, Lucas ×${Array.from(lucasLateShifts).length})`)

  // ── 10. Congés, marketplace, échanges ──────────────────────────────────────
  console.log('10/10  Congés, marketplace, échange de shifts...')

  // Congés
  await sb.from('leave_requests').insert([
    {
      employee_id:      empIds.MARIE,
      establishment_id: estId,
      start_date:       iso(d(TODAY, -18)),
      end_date:         iso(d(TODAY, -16)),
      type:             'CP',
      comment:          'Congés de printemps',
      status:           'approved',
      manager_comment:  'Bonne recharge !',
    },
    {
      employee_id:      empIds.THOMAS,
      establishment_id: estId,
      start_date:       iso(d(MONDAY_P1, 1)),
      end_date:         iso(d(MONDAY_P1, 2)),
      type:             'RTT',
      comment:          'Récupération heures supplémentaires',
      status:           'pending',
    },
    {
      employee_id:      empIds.SOPHIE,
      establishment_id: estId,
      start_date:       SOPHIE_SICK_FROM,
      end_date:         SOPHIE_SICK_TO,
      type:             'maladie',
      comment:          'Arrêt médical délivré le 04/05',
      status:           'approved',
      manager_comment:  'Bon rétablissement Sophie',
    },
    {
      employee_id:      empIds.EMMA,
      establishment_id: estId,
      start_date:       iso(d(TODAY, -5)),
      end_date:         iso(d(TODAY, -3)),
      type:             'CP',
      comment:          'Week-end prolongé',
      status:           'rejected',
      manager_comment:  'Effectifs insuffisants ce week-end — reporter si possible',
    },
    {
      employee_id:      empIds.ANTOINE,
      establishment_id: estId,
      start_date:       iso(d(TODAY, 14)),
      end_date:         iso(d(TODAY, 16)),
      type:             'sans_solde',
      comment:          'Voyage prévu de longue date',
      status:           'pending',
    },
    {
      employee_id:      empIds.LUCAS,
      establishment_id: estId,
      start_date:       iso(d(MONDAY_P1, 3)),
      end_date:         iso(d(MONDAY_P1, 4)),
      type:             'CP',
      comment:          '',
      status:           'approved',
    },
  ])
  console.log('   ✅  6 demandes de congés créées')

  // Marketplace — slot sur un shift d'Emma semaine prochaine
  const { data: emmaNextShift } = await sb
    .from('shifts')
    .select('id')
    .eq('establishment_id', estId)
    .eq('employee_id', empIds.EMMA)
    .gte('date', iso(MONDAY_P1))
    .order('date', { ascending: true })
    .limit(1)
    .single()

  if (emmaNextShift) {
    await sb.from('marketplace_slots').insert({
      shift_id:         emmaNextShift.id,
      establishment_id: estId,
      created_by:       managerId,
      reason:           'Absence imprévue — renfort recherché',
      expires_at:       new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
      status:           'open',
    })
    console.log('   ✅  Slot marketplace créé')
  }

  // Échange de shift — Marie propose à Sophie (shift semaine prochaine)
  const { data: mariNextShift } = await sb
    .from('shifts')
    .select('id')
    .eq('establishment_id', estId)
    .eq('employee_id', empIds.MARIE)
    .gte('date', iso(MONDAY_P1))
    .order('date', { ascending: true })
    .limit(1)
    .single()

  if (mariNextShift) {
    await sb.from('shift_exchanges').insert({
      shift_id:      mariNextShift.id,
      proposer_id:   empIds.MARIE,
      acceptor_id:   empIds.SOPHIE,
      status:        'pending_approval',
      proposer_note: 'Rendez-vous médical ce jour-là, Sophie peut-elle me remplacer ?',
    })
    console.log('   ✅  Échange de shift créé (Marie → Sophie)')
  }

  // ── Résumé ─────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(56))
  console.log('🎉  Seed terminé avec succès !')
  console.log('═'.repeat(56))
  console.log('\n📋  Identifiants de connexion (mot de passe : Demo2024!)\n')
  console.log('  👔  MANAGER')
  console.log('      manager@nexus-demo.fr')
  console.log('\n  👥  EMPLOYÉS')
  for (const emp of EMPLOYEES) {
    console.log(`      ${emp.full.padEnd(22)}  ${emp.email}`)
  }
  console.log('\n  🏪  Établissement : Le Bistrot Parisien')
  console.log(`  🆔  ID             : ${estId}`)
  console.log('\n' + '═'.repeat(56))
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

main().catch(err => { console.error('\n❌  Seed échoué :', err); process.exit(1) })
