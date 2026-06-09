'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function syncDemoPassword(): Promise<{ error?: string }> {
  const email = process.env.DEMO_USER_EMAIL
  const password = process.env.DEMO_USER_PASSWORD
  if (!email || !password) return { error: 'not_configured' }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (!profile?.id) return { error: 'user_not_found' }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    password,
    email_confirm: true,
  })

  return error ? { error: error.message } : {}
}
