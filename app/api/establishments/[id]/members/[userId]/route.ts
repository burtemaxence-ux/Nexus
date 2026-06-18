import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string; userId: string }> }

// DELETE — remove a member from an establishment
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Only managers can remove members
  const { data: callerMembership } = await supabaseAdmin
    .from('user_establishments')
    .select('role')
    .eq('user_id', user.id)
    .eq('establishment_id', id)
    .single()

  if (callerMembership?.role !== 'manager') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // Cannot remove yourself
  if (userId === user.id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas vous retirer vous-même' }, { status: 400 })
  }

  // Ensure at least one manager remains
  const { data: allManagers } = await supabaseAdmin
    .from('user_establishments')
    .select('user_id')
    .eq('establishment_id', id)
    .eq('role', 'manager')

  const { data: targetMembership } = await supabaseAdmin
    .from('user_establishments')
    .select('role')
    .eq('user_id', userId)
    .eq('establishment_id', id)
    .single()

  if (targetMembership?.role === 'manager' && (allManagers?.length ?? 0) <= 1) {
    return NextResponse.json({ error: 'Impossible de retirer le dernier manager' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('user_establishments')
    .delete()
    .eq('user_id', userId)
    .eq('establishment_id', id)

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  return NextResponse.json({ success: true })
}
