import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

/** Returns (and auto-generates if missing) the VAPID public key */
export async function GET() {
  let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

  if (!publicKey) {
    const supabase = await createClient()

    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['vapid_public_key', 'vapid_private_key'])

    const map = Object.fromEntries(
      (data ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
    )

    if (map.vapid_public_key) {
      publicKey = map.vapid_public_key
    } else {
      // Generate and persist new VAPID keys
      const keys = webpush.generateVAPIDKeys()
      await supabase.from('settings').upsert(
        [
          { key: 'vapid_public_key',  value: keys.publicKey  },
          { key: 'vapid_private_key', value: keys.privateKey },
        ],
        { onConflict: 'key' }
      )
      publicKey = keys.publicKey
    }
  }

  return NextResponse.json({ publicKey })
}
