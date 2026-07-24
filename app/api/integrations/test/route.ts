import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { testWebhook } from '@/lib/integrations/webhook'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  const { type } = body as { type: 'webhook' | 'slack' }

  const { data: settingsData } = await supabase.from('settings').select('key, value')
  const settings: Record<string, string> = {}
  for (const row of settingsData ?? []) settings[row.key] = row.value

  if (type === 'webhook') {
    const url = settings.webhook_url
    if (!url) return NextResponse.json({ error: 'Aucune URL webhook configurée' }, { status: 400 })
    const result = await testWebhook(url, 'generic', settings.webhook_signing_secret || undefined)
    return NextResponse.json(result)
  }

  if (type === 'slack') {
    const url = settings.slack_webhook_url
    if (!url) return NextResponse.json({ error: 'Aucune URL Slack configurée' }, { status: 400 })
    const result = await testWebhook(url, 'slack')
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
}
