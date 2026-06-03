import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { DEMO_POSTES } from '@/lib/demo-seed'

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const estId = process.env.DEMO_ESTABLISHMENT_ID
  if (!estId) {
    return NextResponse.json({ error: 'DEMO_ESTABLISHMENT_ID non configuré' }, { status: 500 })
  }

  try {
    await Promise.all([
      supabaseAdmin.from('compliance_alerts').delete().eq('establishment_id', estId),
      supabaseAdmin.from('notifications').delete().eq('establishment_id', estId),
      supabaseAdmin.from('lateness_records').delete().eq('establishment_id', estId),
    ])

    await Promise.all([
      supabaseAdmin.from('replacement_requests').delete().eq('establishment_id', estId),
      supabaseAdmin.from('leave_requests').delete().eq('establishment_id', estId),
      supabaseAdmin.from('presences').delete().eq('establishment_id', estId),
    ])

    await supabaseAdmin.from('shifts').delete().eq('establishment_id', estId)
    await supabaseAdmin.from('contracts').delete().eq('establishment_id', estId)
    await supabaseAdmin.from('availabilities').delete().eq('establishment_id', estId)

    await supabaseAdmin.from('postes').delete().eq('establishment_id', estId)
    await supabaseAdmin.from('postes').insert(
      DEMO_POSTES.map(p => ({ ...p, establishment_id: estId }))
    )

    const demoSettings = [
      { key: 'establishment_name', value: 'Le Bistrot du Port — Démo' },
      { key: 'opening_hour', value: '10:00' },
      { key: 'closing_hour', value: '23:00' },
    ]
    await supabaseAdmin.from('settings').upsert(
      demoSettings.map(s => ({ ...s, establishment_id: estId })),
      { onConflict: 'establishment_id,key' }
    )

    const { data: demoEmployees } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('establishment_id', estId)
      .eq('role', 'employee')
      .limit(3)

    if (demoEmployees && demoEmployees.length > 0) {
      const now = new Date()
      const day = (offsetDays: number) => {
        const d = new Date(now)
        d.setDate(d.getDate() + offsetDays)
        return d.toISOString().slice(0, 10)
      }

      await supabaseAdmin.from('leave_requests').insert([
        {
          employee_id: demoEmployees[0].id,
          establishment_id: estId,
          type: 'CP',
          start_date: day(7),
          end_date: day(14),
          status: 'pending',
        },
        ...(demoEmployees[1] ? [{
          employee_id: demoEmployees[1].id,
          establishment_id: estId,
          type: 'maladie' as const,
          start_date: day(-3),
          end_date: day(-1),
          status: 'approved',
        }] : []),
      ])
    }

    return NextResponse.json({ ok: true, reset_at: new Date().toISOString() })
  } catch (err) {
    console.error('[cron/reset-demo]', err)
    return NextResponse.json({ error: 'Erreur lors du reset de la démo' }, { status: 500 })
  }
}
