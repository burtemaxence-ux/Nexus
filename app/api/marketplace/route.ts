import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'
import { NextRequest, NextResponse } from 'next/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export type MarketplaceApplication = {
  id: string
  employeeId: string
  employeeName: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

export type MarketplaceSlot = {
  id: string
  shiftId: string
  reason: string | null
  expiresAt: string
  status: 'open' | 'filled' | 'expired' | 'cancelled'
  createdAt: string
  filledBy: string | null
  filledByName: string | null
  shift: {
    date: string
    startTime: string
    endTime: string
    position: string | null
    breakMinutes: number
    employeeId: string | null
    employeeName: string | null
  }
  applications: MarketplaceApplication[]
  myApplication: MarketplaceApplication | null
}

// ── GET — list slots ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, establishment_id, active_establishment_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  const establishmentId = profile.active_establishment_id ?? profile.establishment_id
  if (!establishmentId) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 400 })

  const isManager = ['manager', 'supervisor'].includes(profile.role)

  // Fetch slots
  const slotsQuery = supabaseAdmin
    .from('marketplace_slots')
    .select('id, shift_id, reason, expires_at, status, created_at, filled_by')
    .eq('establishment_id', establishmentId)
    .order('created_at', { ascending: false })

  if (!isManager) {
    slotsQuery.eq('status', 'open')
  } else {
    // Managers see open + recent history (last 30 days)
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    slotsQuery.or(`status.eq.open,created_at.gte.${since}`)
  }

  const { data: slots, error } = await slotsQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!slots || slots.length === 0) return NextResponse.json({ slots: [] })

  const shiftIds = slots.map(s => s.shift_id)
  const slotIds  = slots.map(s => s.id)

  // Fetch shifts and applications first (profiles depend on applications)
  const [{ data: shifts }, { data: applications }] = await Promise.all([
    supabaseAdmin
      .from('shifts')
      .select('id, date, start_time, end_time, position, break_minutes, employee_id')
      .in('id', shiftIds),

    isManager
      ? supabaseAdmin
          .from('marketplace_applications')
          .select('id, slot_id, employee_id, status, created_at')
          .in('slot_id', slotIds)
      : supabaseAdmin
          .from('marketplace_applications')
          .select('id, slot_id, employee_id, status, created_at')
          .in('slot_id', slotIds)
          .eq('employee_id', user.id),
  ])

  // Collect all profile IDs needed
  const profileIds = Array.from(new Set<string>([
    ...slots.map(s => s.filled_by).filter((x): x is string => !!x),
    ...(applications ?? []).map((a: { employee_id: string }) => a.employee_id),
    ...(shifts ?? []).map(s => s.employee_id).filter((x): x is string => !!x),
  ]))

  const { data: profiles } = profileIds.length > 0
    ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', profileIds)
    : { data: [] }

  const nameMap   = new Map((profiles ?? []).map(p => [p.id, p.full_name ?? 'Employé']))
  const empNameMap = nameMap

  const shiftMap = new Map((shifts ?? []).map(s => [s.id, s]))

  type AppRow = { id: string; slot_id: string; employee_id: string; status: string; created_at: string }
  const appsBySlot = new Map<string, AppRow[]>()
  for (const a of (applications ?? []) as AppRow[]) {
    if (!appsBySlot.has(a.slot_id)) appsBySlot.set(a.slot_id, [])
    appsBySlot.get(a.slot_id)!.push(a)
  }

  const result: MarketplaceSlot[] = slots.map(slot => {
    const shift = shiftMap.get(slot.shift_id)
    const apps  = appsBySlot.get(slot.id) ?? []

    return {
      id:          slot.id,
      shiftId:     slot.shift_id,
      reason:      slot.reason,
      expiresAt:   slot.expires_at,
      status:      slot.status as MarketplaceSlot['status'],
      createdAt:   slot.created_at,
      filledBy:    slot.filled_by,
      filledByName: slot.filled_by ? (nameMap.get(slot.filled_by) ?? null) : null,
      shift: shift ? {
        date:         shift.date,
        startTime:    shift.start_time,
        endTime:      shift.end_time,
        position:     shift.position,
        breakMinutes: shift.break_minutes ?? 0,
        employeeId:   shift.employee_id,
        employeeName: shift.employee_id ? (empNameMap.get(shift.employee_id) ?? null) : null,
      } : { date: '', startTime: '', endTime: '', position: null, breakMinutes: 0, employeeId: null, employeeName: null },
      applications: apps.map(a => ({
        id:           a.id,
        employeeId:   a.employee_id,
        employeeName: nameMap.get(a.employee_id) ?? 'Employé',
        status:       a.status as MarketplaceApplication['status'],
        createdAt:    a.created_at,
      })),
      myApplication: isManager ? null : (apps.find(a => a.employee_id === user.id)
        ? {
            id:           apps.find(a => a.employee_id === user.id)!.id,
            employeeId:   user.id,
            employeeName: nameMap.get(user.id) ?? 'Moi',
            status:       apps.find(a => a.employee_id === user.id)!.status as MarketplaceApplication['status'],
            createdAt:    apps.find(a => a.employee_id === user.id)!.created_at,
          }
        : null),
    }
  })

  return NextResponse.json({ slots: result })
}

// ── POST — publish a shift to marketplace ─────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, establishment_id, active_establishment_id')
    .eq('id', user.id)
    .single()

  if (!['manager', 'supervisor'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const establishmentId = profile!.active_establishment_id ?? profile!.establishment_id
  const body = await req.json().catch(() => ({})) as {
    shift_id: string; reason?: string; expires_hours?: number
  }

  if (!body.shift_id) return NextResponse.json({ error: 'shift_id requis' }, { status: 400 })

  const expiresHours = body.expires_hours && [2, 4, 8, 24].includes(body.expires_hours)
    ? body.expires_hours : 8

  // Verify shift belongs to this establishment
  const { data: shift } = await supabaseAdmin
    .from('shifts')
    .select('id, date, start_time, end_time, position, break_minutes, employee_id')
    .eq('id', body.shift_id)
    .eq('establishment_id', establishmentId)
    .is('deleted_at', null)
    .single()

  if (!shift) return NextResponse.json({ error: 'Shift introuvable' }, { status: 404 })

  // Check no active slot for this shift
  const { data: existing } = await supabaseAdmin
    .from('marketplace_slots')
    .select('id')
    .eq('shift_id', body.shift_id)
    .eq('status', 'open')
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Ce shift est déjà publié sur la marketplace' }, { status: 409 })

  const expiresAt = new Date(Date.now() + expiresHours * 3600000).toISOString()

  const { data: slot, error } = await supabaseAdmin
    .from('marketplace_slots')
    .insert({
      shift_id:         body.shift_id,
      establishment_id: establishmentId,
      created_by:       user.id,
      reason:           body.reason ?? null,
      expires_at:       expiresAt,
      status:           'open',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Find eligible employees and notify them
  notifyEligibleEmployees(supabase, establishmentId, shift, slot.id).catch(() => {})

  return NextResponse.json({ slot }, { status: 201 })
}

// ── Eligibility helper ────────────────────────────────────────────────────────

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function shiftsOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  let sm1 = timeToMin(s1), em1 = timeToMin(e1)
  let sm2 = timeToMin(s2), em2 = timeToMin(e2)
  if (em1 <= sm1) em1 += 1440
  if (em2 <= sm2) em2 += 1440
  return Math.max(sm1, sm2) < Math.min(em1, em2)
}

async function notifyEligibleEmployees(
  supabase: Awaited<ReturnType<typeof createClient>>,
  establishmentId: string,
  shift: { date: string; start_time: string; end_time: string; position: string | null },
  slotId: string,
) {
  const [{ data: employees }, { data: conflictShifts }, { data: leaves }] = await Promise.all([
    supabaseAdmin.from('profiles')
      .select('id')
      .eq('establishment_id', establishmentId)
      .eq('role', 'employee')
      .eq('archived', false),

    supabaseAdmin.from('shifts')
      .select('employee_id, start_time, end_time')
      .eq('date', shift.date)
      .eq('establishment_id', establishmentId)
      .is('deleted_at', null),

    supabaseAdmin.from('leave_requests')
      .select('employee_id')
      .eq('status', 'approved')
      .lte('start_date', shift.date)
      .gte('end_date', shift.date),
  ])

  const conflictEmpIds = new Set<string>()
  for (const cs of conflictShifts ?? []) {
    if (shiftsOverlap(cs.start_time, cs.end_time, shift.start_time, shift.end_time)) {
      conflictEmpIds.add(cs.employee_id)
    }
  }
  for (const l of leaves ?? []) {
    conflictEmpIds.add(l.employee_id)
  }

  const eligible = (employees ?? []).filter(e => !conflictEmpIds.has(e.id))

  const fmtDate = new Date(shift.date + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
  const fmtTime = `${shift.start_time.slice(0, 5)}–${shift.end_time.slice(0, 5)}`

  for (const emp of eligible) {
    sendPushToUser(supabase, emp.id, {
      title: 'Shift disponible 🔔',
      body:  `${shift.position ?? 'Shift'} · ${fmtDate} ${fmtTime}`,
      url:   '/employee/marketplace',
    }).catch(() => {})
  }
}
