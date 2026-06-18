import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// DELETE — manager cancels a slot
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, establishment_id, active_establishment_id')
    .eq('id', user.id)
    .single()

  if (!['manager', 'supervisor'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const establishmentId = profile!.active_establishment_id ?? profile!.establishment_id

  const { data: slot } = await supabaseAdmin
    .from('marketplace_slots')
    .select('id, status, establishment_id')
    .eq('id', params.id)
    .single()

  if (!slot) return NextResponse.json({ error: 'Slot introuvable' }, { status: 404 })
  if (slot.establishment_id !== establishmentId) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  if (slot.status !== 'open') return NextResponse.json({ error: 'Ce slot ne peut plus être annulé' }, { status: 409 })

  const { error } = await supabaseAdmin
    .from('marketplace_slots')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
