import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { resetDemoData } from '@/lib/demo-seed'

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const estId = process.env.DEMO_ESTABLISHMENT_ID
  if (!estId) {
    return NextResponse.json({ error: 'DEMO_ESTABLISHMENT_ID non configuré' }, { status: 500 })
  }
  try {
    await resetDemoData(estId)
    return NextResponse.json({ ok: true, reset_at: new Date().toISOString() })
  } catch (err) {
    console.error('[cron/reset-demo]', err)
    return NextResponse.json({ error: 'Erreur lors du reset' }, { status: 500 })
  }
}
