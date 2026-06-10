import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createReferralFromCode } from '@/lib/referral'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Vérifier si le profil en base est déjà correctement configuré (manager + son propre établissement)
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('role, establishment_id')
    .eq('id', user.id)
    .single()

  if (existingProfile?.role === 'employee') {
    return NextResponse.json(
      { error: 'Accès refusé — action non autorisée pour un employé' },
      { status: 403 }
    )
  }

  if (existingProfile?.role === 'manager' && existingProfile?.establishment_id) {
    const { data: ownedEst } = await supabaseAdmin
      .from('establishments')
      .select('id')
      .eq('id', existingProfile.establishment_id)
      .eq('owner_id', user.id)
      .maybeSingle()
    if (ownedEst) return NextResponse.json({ role: 'manager', already_setup: true })
  }

  // Créer un établissement dédié pour ce nouveau manager Google
  const { data: establishment, error: estError } = await supabaseAdmin
    .from('establishments')
    .insert({ name: 'Mon établissement', owner_id: user.id })
    .select('id')
    .single()

  if (estError || !establishment) {
    return NextResponse.json({ error: 'Impossible de créer l\'établissement' }, { status: 500 })
  }

  const estId = establishment.id
  const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Manager'

  // Mettre à jour le profil existant (créé par le trigger avec role='employee')
  await supabaseAdmin
    .from('profiles')
    .update({
      role: 'manager',
      full_name: fullName,
      establishment_id: estId,
      active_establishment_id: estId,
    })
    .eq('id', user.id)

  // Lier l'utilisateur à l'établissement dans user_establishments
  await supabaseAdmin
    .from('user_establishments')
    .upsert({ user_id: user.id, establishment_id: estId }, { onConflict: 'user_id,establishment_id' })

  // Mettre à jour les métadonnées Supabase Auth
  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, role: 'manager', full_name: fullName },
  })

  // Enregistrer le parrainage si un code a été utilisé à l'inscription
  const referralCode = user.user_metadata?.referral_code as string | undefined
  if (referralCode) {
    await createReferralFromCode(referralCode, user.id)
  }

  return NextResponse.json({ role: 'manager', establishment_id: estId })
}
