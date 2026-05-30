import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications/create'
import { sendPushToUser } from '@/lib/push'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { captureError } from '@/lib/logger'

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    // Find shifts whose end_time was 15+ minutes ago and have no clock_out today.
    // We compare shift end_time (TIME) to current UTC time.
    // Grace window: 15 min after end_time. Re-notify window: 30 min cooldown.
    const cutoff15min = new Date(now.getTime() - 15 * 60 * 1000)
    const cutoff30min = new Date(now.getTime() - 30 * 60 * 1000)

    const cutoff15Str = cutoff15min.toISOString().slice(11, 16) // HH:MM in UTC
    const cutoff30Str = cutoff30min.toISOString().slice(11, 16)

    // Shifts published today, ending between 30min and 15min ago (i.e., missed the window)
    // to avoid double-sending in the same 15-min cron tick.
    const { data: shifts, error: shiftsErr } = await supabaseAdmin
      .from('shifts')
      .select('id, employee_id, end_time, profiles:employee_id(establishment_id)')
      .eq('date', todayStr)
      .eq('status', 'published')
      .lte('end_time', cutoff15Str)  // ended at least 15 min ago
      .gte('end_time', cutoff30Str)  // but not more than 30 min ago (avoid re-notifying old shifts)

    if (shiftsErr) {
      console.error('[check-missing-clockout] shifts query error:', shiftsErr.message)
      return NextResponse.json({ error: shiftsErr.message }, { status: 500 })
    }

    if (!shifts?.length) {
      return NextResponse.json({ checked: 0, notified: 0 })
    }

    // Get employees who already clocked out today
    const employeeIds = Array.from(new Set(shifts.map((s: { employee_id: string }) => s.employee_id)))
    const { data: presences } = await supabaseAdmin
      .from('presences')
      .select('employee_id, clock_out')
      .eq('date', todayStr)
      .in('employee_id', employeeIds)

    const clockedOut = new Set(
      (presences ?? [])
        .filter((p: { employee_id: string; clock_out: string | null }) => p.clock_out !== null)
        .map((p: { employee_id: string; clock_out: string | null }) => p.employee_id)
    )

    // Check which employees already got a reminder in the last 30 min (cooldown)
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
    const { data: recentNotifs } = await supabaseAdmin
      .from('notifications')
      .select('user_id')
      .eq('type', 'reminder_clockout')
      .in('user_id', employeeIds)
      .gte('created_at', thirtyMinAgo)

    const alreadyNotified = new Set((recentNotifs ?? []).map((n: { user_id: string }) => n.user_id))

    // Find shifts to notify: no clock_out and no recent reminder
    type ShiftRow = { id: string; employee_id: string; end_time: string; profiles: unknown }
    const toNotify = (shifts as ShiftRow[]).filter(s =>
      !clockedOut.has(s.employee_id) &&
      !alreadyNotified.has(s.employee_id)
    )

    if (!toNotify.length) {
      return NextResponse.json({ checked: shifts.length, notified: 0 })
    }

    // Create in-app notifications + push for each employee
    let notified = 0
    await Promise.allSettled(
      toNotify.map(async (shift: ShiftRow) => {
        const endLabel = shift.end_time.slice(0, 5) // HH:MM
        const profile = Array.isArray(shift.profiles) ? shift.profiles[0] : shift.profiles
        const establishmentId = (profile as { establishment_id?: string } | null)?.establishment_id ?? null

        await createNotification({
          user_ids: [shift.employee_id],
          establishment_id: establishmentId,
          type: 'reminder_clockout',
          title: "⏰ N'oublie pas de pointer ta sortie !",
          body: `Ton shift s'est terminé à ${endLabel}`,
          action_url: '/employee/badgeuse',
        })

        // Push notification (best-effort, reuses existing push infrastructure)
        sendPushToUser(supabaseAdmin, shift.employee_id, {
          title: "⏰ N'oublie pas de pointer ta sortie !",
          body: `Ton shift s'est terminé à ${endLabel}`,
          url: '/employee/badgeuse',
        }).catch(console.error)

        notified++
      })
    )

    console.log(`[check-missing-clockout] checked=${shifts.length} notified=${notified}`)
    return NextResponse.json({ checked: shifts.length, notified })
  } catch (err) {
    captureError(err, { cron: 'check-missing-clockout' })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
