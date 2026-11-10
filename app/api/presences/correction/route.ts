import { requireAuth } from '@/lib/api-auth'
import { isDemoAccount } from '@/lib/demo'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const target = z.object({ employeeId: z.string().uuid(), date: z.iso.date() })
const instant = z.iso.datetime({ offset: true })
const correction = target.extend({
  expectedUpdatedAt: instant.nullable(),
  clockIn: instant,
  clockOut: instant.nullable(),
  reason: z.string().trim().min(1).max(500),
})

function correctionError(error: { code: string; message: string }) {
  if (error.code === '42501') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  if (error.code === '22023') return NextResponse.json({ error: error.message }, { status: 400 })
  if (['40001', '23505'].includes(error.code)) {
    return NextResponse.json({ error: 'Le pointage a changé. Fermez la fenêtre et rouvrez-la.' }, { status: 409 })
  }
  return NextResponse.json({ error: 'Impossible de traiter la correction du pointage.' }, { status: 500 })
}

async function correctionActor() {
  const { user, profile } = await requireAuth(await createClient())
  if (profile.role !== 'manager') throw NextResponse.json({ error: 'Accès réservé aux managers.' }, { status: 403 })
  return user
}

export async function GET(request: NextRequest) {
  try {
    const user = await correctionActor()
    const params = request.nextUrl.searchParams
    const parsed = target.safeParse({ employeeId: params.get('employeeId'), date: params.get('date') })
    if (!parsed.success) return NextResponse.json({ error: 'Pointage invalide.' }, { status: 400 })

    const { employeeId, date } = parsed.data
    const { data: site, error: scopeError } = await supabaseAdmin.rpc('presence_correction_site', {
      p_actor: user.id, p_employee: employeeId,
    })
    if (scopeError) return correctionError(scopeError)

    const { data: presence, error: presenceError } = await supabaseAdmin.from('presences').select('id')
      .eq('establishment_id', site).eq('employee_id', employeeId).eq('date', date).maybeSingle()
    if (presenceError) return correctionError(presenceError)
    if (!presence) return NextResponse.json([])

    const { data, error } = await supabaseAdmin.from('audit_log')
      .select('id, old_data, new_data, performed_by, created_at')
      .eq('establishment_id', site).eq('table_name', 'presences').eq('record_id', presence.id)
      .order('created_at', { ascending: false })
    if (error) return correctionError(error)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await correctionActor()
    if (isDemoAccount(user.email)) {
      return NextResponse.json({ error: 'La correction des pointages est désactivée dans la démonstration publique.' }, { status: 403 })
    }
    const parsed = correction.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Vérifiez les heures et le motif de correction.' }, { status: 400 })

    const { employeeId, date, expectedUpdatedAt, clockIn, clockOut, reason } = parsed.data
    const { error } = await supabaseAdmin.rpc('correct_presence', {
      p_actor: user.id, p_employee: employeeId, p_date: date, p_expected_updated_at: expectedUpdatedAt,
      p_clock_in: clockIn, p_clock_out: clockOut, p_reason: reason,
    })
    if (error) return correctionError(error)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }
}
