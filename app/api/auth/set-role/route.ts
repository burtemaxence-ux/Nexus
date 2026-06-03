import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Ne set le rôle que si pas encore défini
  if (user.user_metadata?.role) {
    return NextResponse.json({ role: user.user_metadata.role })
  }

  const { error } = await supabase.auth.updateUser({
    data: { role: 'manager', full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ role: 'manager' })
}
