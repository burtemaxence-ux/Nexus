import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { ContractSchema, validationError } from '@/lib/validations'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)

    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''

    const { data: target } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', params.id)
      .eq('establishment_id', estId)
      .single()

    if (!target) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })

    const { data, error } = await supabase
      .from('contracts')
      .select('id, employee_id, type, start_date, end_date, weekly_hours, hourly_rate, monthly_gross_salary, classification, coefficient, has_mutuelle, has_meal_vouchers, meal_voucher_value, has_transport_reimbursement, job_title, work_location, cdd_reason, trial_period_days, notice_period_days, paid_leave_days, has_confidentiality, has_non_compete, notes, created_by, created_at')
      .eq('employee_id', params.id)
      .is('deleted_at', null)
      .order('start_date', { ascending: false })
    if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
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

    const { data: target } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', params.id)
      .eq('establishment_id', estId)
      .single()

    if (!target) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })

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
        monthly_gross_salary: body.monthly_gross_salary ?? null,
        classification: body.classification ?? null,
        coefficient: body.coefficient ?? null,
        has_mutuelle: body.has_mutuelle ?? false,
        has_meal_vouchers: body.has_meal_vouchers ?? false,
        meal_voucher_value: body.meal_voucher_value ?? null,
        has_transport_reimbursement: body.has_transport_reimbursement ?? false,
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
