import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { generatePin, hashPin } from '@/lib/pin'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  let estId: string
  try {
    const { profile } = await requireManager(supabase)
    estId = profile.active_establishment_id ?? profile.establishment_id ?? ''
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }

  // Scopé à l'établissement du manager : on ne réinitialise que ses employés.
  const newPin = generatePin()
  const pinHash = await hashPin(newPin)
  const { data, error } = await supabase
    .from('profiles')
    .update({ pin: pinHash })
    .eq('id', params.id)
    .eq('establishment_id', estId)
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })
  // Return the plain PIN once for display — never return the hash
  return NextResponse.json({ pin: newPin })
}
