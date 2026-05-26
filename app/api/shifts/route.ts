import { createClient } from '@/lib/supabase/server'
import { ShiftSchema, validationError } from '@/lib/validations'
import { fireWebhook } from '@/lib/integrations/webhook'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const employeeParam = searchParams.get('employee')
  const date = searchParams.get('date')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase
    .from('shifts')
    .select('id, start_time, end_time, position, date, employee_id, break_minutes, notes, poste_id, status')
    .is('deleted_at', null)

  if (employeeParam === 'me') {
    query = query.eq('employee_id', user.id)
  } else if (employeeParam) {
    query = query.eq('employee_id', employeeParam)
  }

  if (from && to) {
    query = query.gte('date', from).lte('date', to)
  } else if (date) {
    query = query.eq('date', date)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Erreur lors de la récupération des shifts' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Verify the user is a manager
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, establishment_id, active_establishment_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !['manager', 'supervisor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const raw = await request.json().catch(() => null)
    const parsed = ShiftSchema.safeParse(raw)
    if (!parsed.success) return validationError(parsed.error)

    const { employee_id, date, start_time, end_time, position, poste_id, break_minutes, notes } = parsed.data

    const { data, error } = await supabase
      .from('shifts')
      .insert({
        employee_id,
        date,
        start_time,
        end_time,
        position: position || null,
        poste_id: poste_id ?? null,
        break_minutes: break_minutes ?? 0,
        notes: notes || null,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('[shifts POST] error:', error)
      return NextResponse.json({ error: 'Erreur lors de la création du shift' }, { status: 500 })
    }

    // Fire webhook (non-blocking)
    const establishmentId = profile.active_establishment_id ?? profile.establishment_id
    if (establishmentId) {
      supabase.from('settings').select('key, value').then(({ data: settings }) => {
        const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))
        const empName = supabase.from('profiles').select('full_name').eq('id', employee_id).single()
          .then(({ data: emp }) => {
            void fireWebhook(settingsMap, 'shift.created', {
              employeeName: emp?.full_name ?? employee_id,
              date,
              startTime: start_time,
              endTime: end_time,
            }, { establishmentId })
          })
        void empName
      })
    }

    return NextResponse.json({ shift: data }, { status: 201 })
  } catch (err) {
    console.error('[shifts POST] exception:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
