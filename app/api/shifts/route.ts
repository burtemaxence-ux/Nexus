import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireManager } from '@/lib/api-auth'
import { ShiftSchema, validationError } from '@/lib/validations'
import { fireWebhook } from '@/lib/integrations/webhook'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { user } = await requireAuth(supabase)

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
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)

    const raw = await request.json().catch(() => null)
    const parsed = ShiftSchema.safeParse(raw)
    if (!parsed.success) return validationError(parsed.error)

    const { employee_id, date, start_time, end_time, position, poste_id, break_minutes, notes } = parsed.data

    // Vérifie que l'employé est visible pour ce manager. Les profils sont scopés
    // par établissement en RLS : un employee_id d'un autre établissement renvoie
    // null ici, ce qui évite de créer un shift rattaché à un employé d'un autre
    // tenant (le trigger force l'establishment_id du manager sur le shift).
    const { data: emp } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', employee_id)
      .maybeSingle()
    if (!emp) {
      return NextResponse.json({ error: 'Employé introuvable dans cet établissement' }, { status: 400 })
    }

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
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    console.error('[shifts POST] exception:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
