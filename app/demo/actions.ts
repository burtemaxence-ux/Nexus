'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

const DEMO_EMAIL = 'demo@quartzbase.fr'

export async function getDemoMagicLink(): Promise<{ url?: string; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_URL ?? 'https://quartzbase.fr'

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: DEMO_EMAIL,
    options: { redirectTo: `${appUrl}/auth/callback?next=/manager` },
  })

  if (error || !data?.properties?.action_link) {
    console.error('[Demo] generateLink error:', error?.message ?? 'no action_link')
    return { error: error?.message ?? 'no action_link' }
  }

  return { url: data.properties.action_link }
}
