import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications/create'
import { sendPushToUser } from '@/lib/push'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { captureError } from '@/lib/logger'

// Vercel Cron : tous les jours à 17h00 UTC (~19h FR) → "0 17 * * *"
// Rappelle à chaque employé son service du lendemain (in-app + push).
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const { data: shifts, error } = await supabaseAdmin
      .from('shifts')
      .select('employee_id, start_time, end_time, profiles:employee_id(establishment_id)')
      .eq('date', tomorrow)
      .eq('status', 'published')
      .is('deleted_at', null)

    if (error) {
      console.error('[shift-reminder] query error:', error.message)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
    if (!shifts?.length) return NextResponse.json({ reminded: 0 })

    type Row = { employee_id: string; start_time: string; end_time: string; profiles: unknown }
    let reminded = 0
    await Promise.allSettled((shifts as Row[]).map(async (s) => {
      const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
      const establishmentId = (profile as { establishment_id?: string } | null)?.establishment_id ?? null
      const start = s.start_time.slice(0, 5)
      const end = s.end_time.slice(0, 5)
      await createNotification({
        user_ids: [s.employee_id],
        establishment_id: establishmentId,
        type: 'shift_reminder',
        title: '📅 Demain, tu travailles',
        body: `Service de ${start} à ${end}`,
        action_url: '/employee/planning',
      })
      sendPushToUser(supabaseAdmin, s.employee_id, {
        title: '📅 Rappel : demain tu travailles',
        body: `Service de ${start} à ${end}`,
        url: '/employee/planning',
      }).catch(() => {})
      reminded++
    }))

    return NextResponse.json({ reminded })
  } catch (err) {
    captureError(err, { cron: 'shift-reminder' })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
