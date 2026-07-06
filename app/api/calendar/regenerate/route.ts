import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Révoque le lien calendrier de l'utilisateur connecté : incrémente
// calendar_token_version, ce qui invalide tous les tokens émis avant.
// Le nouveau lien s'affiche au rechargement de la page planning.
export async function POST() {
  try {
    const supabase = await createClient()
    const { user } = await requireAuth(supabase)

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('calendar_token_version')
      .eq('id', user.id)
      .single()

    const next = (profile?.calendar_token_version ?? 1) + 1
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ calendar_token_version: next })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Impossible de régénérer le lien' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
