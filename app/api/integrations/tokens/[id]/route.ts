import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, establishment_id, active_establishment_id').eq('id', user.id).single()
  if (profile?.role !== 'manager') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const establishmentId = profile.active_establishment_id ?? profile.establishment_id

  const { error } = await supabaseAdmin
    .from('api_tokens')
    .delete()
    .eq('id', id)
    .eq('establishment_id', establishmentId)

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  return NextResponse.json({ success: true })
}
