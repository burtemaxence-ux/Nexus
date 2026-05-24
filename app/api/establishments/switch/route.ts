import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { establishment_id } = await request.json()
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
