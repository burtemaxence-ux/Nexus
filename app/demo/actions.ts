'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

const DEMO_USER_ID = 'c4000000-0000-0000-0000-000000000001'
const DEMO_PASSWORD = 'Demo2024!'

export async function ensureDemoAuth(): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(DEMO_USER_ID, {
    password: DEMO_PASSWORD,
    email_confirm: true,
  })
  if (error?.message.toLowerCase().includes('not found')) {
    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: 'demo@quartzbase.fr',
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Claire Fontaine', role: 'manager' },
    })
    return createErr ? { error: createErr.message } : {}
  }
  return error ? { error: error.message } : {}
}
