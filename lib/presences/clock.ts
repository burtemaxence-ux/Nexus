import { createClient } from '@/lib/supabase/server'

export async function clockIdentity(): Promise<{ userId: string; establishmentId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('establishment_id')
    .eq('id', user.id)
    .single()
  if (error || !profile) throw new Error('Profil introuvable pour le pointage')

  // La présence appartient au salarié et à son établissement de rattachement.
  // active_establishment_id est modifiable pour la navigation multi-site.
  return { userId: user.id, establishmentId: profile.establishment_id }
}
