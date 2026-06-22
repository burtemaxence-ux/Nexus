import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  for (const name of ['logos', 'avatars'] as const) {
    const { error } = await supabaseAdmin.storage.createBucket(name, {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
      fileSizeLimit: 2097152,
    })
    // Ignore "already exists" error
    if (error && !error.message.includes('already exists')) {
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
