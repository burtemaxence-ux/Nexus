import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

export type PushPayload = {
  title: string
  body: string
  icon?: string
  url?: string
}

let vapidReady = false

async function initVapid(supabase: SupabaseClient) {
  if (vapidReady) return true

  let pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
  let priv = process.env.VAPID_PRIVATE_KEY ?? ''

  if (!pub || !priv) {
    // Load from settings table (auto-generated on first use)
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['vapid_public_key', 'vapid_private_key'])
    const map = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]))
    pub  = map.vapid_public_key  ?? ''
    priv = map.vapid_private_key ?? ''
  }

  if (!pub || !priv) return false

  const email = process.env.VAPID_EMAIL ?? 'admin@nexus-app.fr'
  webpush.setVapidDetails(`mailto:${email}`, pub, priv)
  vapidReady = true
  return true
}

export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload
) {
  if (!(await initVapid(supabase))) return

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs?.length) return

  const body = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    icon:  payload.icon ?? '/api/pwa/icon?size=192',
    badge: '/api/pwa/icon?size=96',
    data:  { url: payload.url ?? '/employee' },
  })

  await Promise.allSettled(
    subs.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        )
      } catch (err) {
        console.error('[push] sendNotification error:', err)
        // Subscription expired or invalid — remove it
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    })
  )
}

export async function sendPushToMany(
  supabase: SupabaseClient,
  userIds: string[],
  payload: PushPayload
) {
  if (!userIds.length) return
  await Promise.allSettled(userIds.map(id => sendPushToUser(supabase, id, payload)))
}
