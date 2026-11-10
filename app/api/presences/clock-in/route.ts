import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { createNotification } from '@/lib/notifications/create'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { clockIdentity } from '@/lib/presences/clock'
import { parisDate, parisShiftInstant } from '@/lib/presences/date'
import { NextResponse } from 'next/server'

const LATE_GRACE_MINUTES = 2

export async function POST() {
  const identity = await clockIdentity()
  if (!identity) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { userId, establishmentId } = identity
  const supabase = supabaseAdmin

  // 5 clock-ins per hour max per user — covers legit retries and blocks abuse
  const rl = await checkRateLimit({ key: `clock-in:${userId}`, limit: 5, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const now = new Date()
  const clockInTime = now.toISOString()
  const today = parisDate(now)

  const { data: openPresence, error: openError } = await supabase
    .from('presences').select('id').eq('employee_id', userId)
    .eq('establishment_id', establishmentId).is('clock_out', null)
    .not('clock_in', 'is', null).limit(1).maybeSingle()
  if (openError) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  if (openPresence) return NextResponse.json({ error: 'Un pointage est déjà en cours' }, { status: 409 })

  const { data, error } = await supabase
    .from('presences')
    .insert({ employee_id: userId, establishment_id: establishmentId, date: today, clock_in: clockInTime })
    .select()
    .single()

  if (error?.code === '23505') return NextResponse.json({ error: 'Vous avez déjà pointé aujourd’hui' }, { status: 409 })
  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  // Auto-create lateness record if clock_in is after the closest shift start
  try {
    const { data: todayShifts } = await supabase
      .from('shifts')
      .select('start_time')
      .eq('employee_id', userId)
      .eq('establishment_id', establishmentId)
      .eq('date', today)
      .order('start_time')

    if (todayShifts && todayShifts.length > 0) {
      const clockInMs = new Date(clockInTime).getTime()
      const validShifts = todayShifts.map(s => ({ shift: s, start: parisShiftInstant(today, s.start_time) }))
        .filter((s): s is { shift: typeof todayShifts[number]; start: Date } => s.start !== null)
      const closest = validShifts.reduce<(typeof validShifts)[number] | null>((best, s) => {
        return !best || Math.abs(s.start.getTime() - clockInMs) < Math.abs(best.start.getTime() - clockInMs) ? s : best
      }, null)
      if (closest) {
        const shiftStartMs = closest.start.getTime()
        const lateMinutes = Math.max(0, Math.floor((clockInMs - shiftStartMs) / 60000))

        if (lateMinutes >= LATE_GRACE_MINUTES) {
          // Check auto_justify_late_on_leave automation setting
          let autoJustify = false
          const { data: settingRow } = await supabase
            .from('settings').select('value').eq('establishment_id', establishmentId).eq('key', 'automation_rules').maybeSingle()
          if (settingRow?.value) {
            try { autoJustify = JSON.parse(settingRow.value).auto_justify_late_on_leave === true } catch { /* ignore */ }
          }

          // If auto_justify is on, check for an approved leave today
          let justifiedByLeave = false
          if (autoJustify) {
            const { data: leave } = await supabase
              .from('leave_requests')
              .select('id')
              .eq('employee_id', userId)
              .eq('establishment_id', establishmentId)
              .eq('status', 'approved')
              .lte('start_date', today)
              .gte('end_date', today)
              .limit(1)
            if (leave && leave.length > 0) justifiedByLeave = true
          }

          await supabase.from('lateness_records').upsert(
            {
              employee_id: userId,
              establishment_id: establishmentId,
              date: today,
              scheduled_time: closest.shift.start_time,
              actual_time: clockInTime,
              late_minutes: lateMinutes,
              justified: justifiedByLeave,
            },
            { onConflict: 'employee_id,date' }
          )
        }
      }
    }
  } catch {
    // Best-effort — don't block the clock-in response
  }

  // In-app notification to manager(s) if notify_manager_clockin setting is enabled
  try {
    const { data: notifSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'notify_manager_clockin')
      .eq('establishment_id', establishmentId)
      .maybeSingle()

    if (notifSetting?.value === 'true') {
      const { data: emp } = await supabase
        .from('profiles')
        .select('full_name, establishment_id')
        .eq('id', userId)
        .single()

      if (emp?.establishment_id) {
        const { data: managers } = await supabase
          .from('profiles')
          .select('id')
          .eq('establishment_id', emp.establishment_id)
          .in('role', ['manager', 'supervisor'])
          .eq('archived', false)

        const managerIds = (managers ?? []).map((m: { id: string }) => m.id)
        if (managerIds.length) {
          const clockInDate = new Date(clockInTime)
          const timeLabel = clockInDate.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })
          const empName = emp.full_name ?? 'Un employé'

          // Compute lateness message from previously-computed lateMinutes (best-effort)
          const { data: latenessRow } = await supabase
            .from('lateness_records')
            .select('late_minutes')
            .eq('employee_id', userId)
            .eq('establishment_id', establishmentId)
            .eq('date', today)
            .maybeSingle()

          const lateMin = latenessRow?.late_minutes ?? 0
          const bodyMsg = lateMin >= LATE_GRACE_MINUTES
            ? `À ${timeLabel} — ${lateMin} min de retard`
            : `À ${timeLabel} — À l'heure`

          createNotification({
            user_ids: managerIds,
            establishment_id: emp.establishment_id,
            type: 'employee_clocked_in',
            title: `${empName} a pointé son arrivée`,
            body: bodyMsg,
          }).catch(() => {})
        }
      }
    }
  } catch {
    // Best-effort — don't block the response
  }

  return NextResponse.json(data)
}
