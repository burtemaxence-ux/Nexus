import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const clockInTime = body.time ?? new Date().toISOString()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('presences')
    .upsert(
      { employee_id: user.id, date: today, clock_in: clockInTime, updated_at: new Date().toISOString() },
      { onConflict: 'employee_id,date', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-create lateness record if clock_in is after the closest shift start
  try {
    const { data: todayShifts } = await supabase
      .from('shifts')
      .select('start_time')
      .eq('employee_id', user.id)
      .eq('date', today)
      .order('start_time')

    if (todayShifts && todayShifts.length > 0) {
      const clockInMs = new Date(clockInTime).getTime()
      const closest = todayShifts.reduce((best, s) => {
        const sMs = new Date(`${today}T${s.start_time}`).getTime()
        const bMs = new Date(`${today}T${best.start_time}`).getTime()
        return Math.abs(sMs - clockInMs) < Math.abs(bMs - clockInMs) ? s : best
      })
      const shiftStartMs = new Date(`${today}T${closest.start_time}`).getTime()
      const lateMinutes = Math.max(0, Math.floor((clockInMs - shiftStartMs) / 60000))

      if (lateMinutes > 0) {
        // Check auto_justify_late_on_leave automation setting
        let autoJustify = false
        const { data: settingRow } = await supabase
          .from('settings').select('value').eq('key', 'automation_rules').maybeSingle()
        if (settingRow?.value) {
          try { autoJustify = JSON.parse(settingRow.value).auto_justify_late_on_leave === true } catch { /* ignore */ }
        }

        // If auto_justify is on, check for an approved leave today
        let justifiedByLeave = false
        if (autoJustify) {
          const { data: leave } = await supabase
            .from('leave_requests')
            .select('id')
            .eq('employee_id', user.id)
            .eq('status', 'approved')
            .lte('start_date', today)
            .gte('end_date', today)
            .limit(1)
          if (leave && leave.length > 0) justifiedByLeave = true
        }

        await supabase.from('lateness_records').upsert(
          {
            employee_id: user.id,
            date: today,
            scheduled_time: closest.start_time,
            actual_time: clockInTime,
            late_minutes: lateMinutes,
            justified: justifiedByLeave,
          },
          { onConflict: 'employee_id,date' }
        )
      }
    }
  } catch {
    // Best-effort — don't block the clock-in response
  }

  return NextResponse.json(data)
}
