import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  const { establishment_id } = body as { establishment_id?: string }
  if (!establishment_id) return NextResponse.json({ error: 'establishment_id requis' }, { status: 400 })

  // Verify the user actually has access to this establishment
  const { data: membership } = await supabase
    .from('user_establishments')
    .select('id')
    .eq('user_id', user.id)
    .eq('establishment_id', establishment_id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { error } = await supabase
    .from('profiles')
    .update({ active_establishment_id: establishment_id })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  return NextResponse.json({ success: true })
}
