import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { ContractSchema, validationError } from '@/lib/validations'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)

    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''

    const { data: emp } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', params.id)
      .eq('establishment_id', estId)
      .single()

    if (!emp) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })

    const { data, error } = await supabase
      .from('contracts')
      .select('id, employee_id, type, start_date, end_date, weekly_hours, hourly_rate, job_title, work_location, cdd_reason, trial_period_days, notice_period_days, paid_leave_days, has_confidentiality, has_non_compete, notes, created_by, created_at')
      .eq('employee_id', params.id)
      .is('deleted_at', null)
      .order('start_date', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { user, profile } = await requireManager(supabase)

    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''

    const { data: emp } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', params.id)
      .eq('establishment_id', estId)
      .single()

    if (!emp) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })

    const raw = await req.json().catch(() => null)
    const parsed = ContractSchema.safeParse(raw)
    if (!parsed.success) return validationError(parsed.error)

    const body = parsed.data
    const { data, error } = await supabase
      .from('contracts')
      .insert({
        employee_id: params.id,
        type: body.type,
        start_date: body.start_date,
        end_date: body.end_date ?? null,
        weekly_hours: body.weekly_hours ?? null,
        hourly_rate: body.hourly_rate ?? null,
        job_title: body.job_title ?? null,
        work_location: body.work_location ?? null,
        cdd_reason: body.cdd_reason ?? null,
        trial_period_days: body.trial_period_days ?? null,
        notice_period_days: body.notice_period_days ?? null,
        paid_leave_days: body.paid_leave_days ?? 25,
        has_confidentiality: body.has_confidentiality ?? false,
        has_non_compete: body.has_non_compete ?? false,
        notes: body.notes ?? null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Erreur lors de la création du contrat' }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
