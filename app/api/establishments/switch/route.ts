import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  const { establishment_id } = body as { establishment_id?: string }
  if (!establishment_id) return NextResponse.json({ error: 'establishment_id requis' }, { status: 400 })

  // Vérifie l'accès ET lit le rôle propre à cet établissement.
  const { data: membership } = await supabase
    .from('user_establishments')
    .select('role')
    .eq('user_id', user.id)
    .eq('establishment_id', establishment_id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  // Rôle par établissement : le rôle effectif suit l'établissement actif.
  // user_establishments.role est garanti 'manager' | 'supervisor' (contrainte
  // DB). On écrit role via le service-role car, depuis la migration 084, la
  // colonne role n'est plus modifiable par le rôle `authenticated`.
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ active_establishment_id: establishment_id, role: membership.role })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  // Garde user_metadata.role aligné (le middleware le lit pour le routing).
  // manager et supervisor sont tous deux autorisés sur /manager : un éventuel
  // décalage du JWT jusqu'au prochain refresh n'affecte donc pas le routing.
  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, role: membership.role },
  })

  return NextResponse.json({ success: true })
}
