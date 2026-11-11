import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireManager } from '@/lib/api-auth'
import { ShiftSchema, validationError } from '@/lib/validations'
import { fireWebhook } from '@/lib/integrations/webhook'
import { syncPlanningConformity } from '@/lib/compliance/persist'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { user, profile } = await requireAuth(supabase)
    const establishmentId = profile.active_establishment_id ?? profile.establishment_id
    if (!establishmentId) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const employeeParam = searchParams.get('employee')
    const date = searchParams.get('date')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let query = supabase
      .from('shifts')
      .select('id, start_time, end_time, position, date, employee_id, break_minutes, notes, poste_id, status')
      .eq('establishment_id', establishmentId)
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
    const establishmentId = profile.active_establishment_id ?? profile.establishment_id
    if (!establishmentId) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 403 })

    const raw = await request.json().catch(() => null)
    const parsed = ShiftSchema.safeParse(raw)
    if (!parsed.success) return validationError(parsed.error)

    const { employee_id, date, start_time, end_time, position, poste_id, break_minutes, notes } = parsed.data

    const { data: emp } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', employee_id)
      .eq('establishment_id', establishmentId)
      .maybeSingle()
    if (!emp) {
      return NextResponse.json({ error: 'Employé introuvable dans cet établissement' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('shifts')
      .insert({
        employee_id,
        establishment_id: establishmentId,
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
      // Doublon exact bloqué par l'index unique partiel (migration 072) :
      // message clair en 409 plutôt qu'un 500 opaque.
      if ((error as { code?: string }).code === '23505') {
        return NextResponse.json({ error: 'Ce créneau existe déjà pour cet employé.' }, { status: 409 })
      }
      if (error.code === '42501') {
        return NextResponse.json({ error: 'Employé ou poste indisponible dans cet établissement' }, { status: 400 })
      }
      console.error('[shifts POST] error:', error)
      return NextResponse.json({ error: 'Erreur lors de la création du shift' }, { status: 500 })
    }

    // Fire webhook (non-blocking)
    void supabase.from('settings').select('key, value').eq('establishment_id', establishmentId)
      .then(async ({ data: settings }) => {
        const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))
        const { data: employee } = await supabase.from('profiles').select('full_name')
          .eq('id', employee_id).eq('establishment_id', establishmentId).single()
        void fireWebhook(settingsMap, 'shift.created', {
          employeeName: employee?.full_name ?? employee_id,
          date,
          startTime: start_time,
          endTime: end_time,
        }, { establishmentId })
      })

    // Trace de conformité planning (non bloquant — ne bloque jamais la sauvegarde).
    await syncPlanningConformity({ establishmentId, employeeId: employee_id, anyDateInWeek: date })

    return NextResponse.json({ shift: data }, { status: 201 })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    console.error('[shifts POST] exception:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
