import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { netShiftHours, weeklyOvertimeHours } from '@/lib/hours'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

// Totaux de synthèse de la période (lecture seule) pour le hero de la page Exports.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    await requireManager(supabase)

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') ?? ''
    const to   = searchParams.get('to')   ?? ''
    if (!from || !to) return NextResponse.json({ error: 'Paramètres from/to requis' }, { status: 400 })

    const [empRes, shiftRes, lateRes, absRes] = await Promise.all([
      supabase.from('profiles').select('id, weekly_hours').eq('role', 'employee').eq('archived', false),
      supabase.from('shifts').select('employee_id, date, start_time, end_time, break_minutes').gte('date', from).lte('date', to).is('deleted_at', null),
      supabase.from('lateness_records').select('id', { count: 'exact', head: true }).gte('date', from).lte('date', to),
      supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'approved').lte('start_date', to).gte('end_date', from),
    ])

    const employees = empRes.data ?? []
    const shifts = shiftRes.data ?? []

    let plannedHours = 0
    let overtimeHours = 0
    for (const emp of employees) {
      const empShifts = shifts.filter(s => s.employee_id === emp.id)
      plannedHours += empShifts.reduce((sum, sh) => sum + netShiftHours(sh.start_time, sh.end_time, sh.break_minutes), 0)
      // Heures sup par semaine ISO (comme le rapport paie), seuil = quotité
      // contractuelle ou 35h par défaut. Ne se nettent pas entre semaines.
      overtimeHours += weeklyOvertimeHours(empShifts, emp.weekly_hours ?? 35)
    }

    return NextResponse.json({
      plannedHours: Math.round(plannedHours),
      overtimeHours: Math.round(overtimeHours),
      lateCount: lateRes.count ?? 0,
      absenceCount: absRes.count ?? 0,
    })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
