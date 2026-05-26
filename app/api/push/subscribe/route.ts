import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: 'Souscription invalide' }, { status: 400 })
  }

  await supabase.from('push_subscriptions').upsert(
    {
      user_id:  user.id,
      endpoint: body.endpoint,
      p256dh:   body.keys.p256dh,
      auth:     body.keys.auth,
    },
    { onConflict: 'user_id,endpoint' }
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { endpoint?: string }
  if (body.endpoint) {
    await supabase.from('push_subscriptions').delete()
      .eq('user_id', user.id).eq('endpoint', body.endpoint)
  } else {
    await supabase.from('push_subscriptions').delete().eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
