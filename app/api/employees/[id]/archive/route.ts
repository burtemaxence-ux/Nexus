import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)
    const estId = profile.active_establishment_id ?? profile.establishment_id
    if (!estId) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 400 })

    const { archived } = await req.json()

    // Scopé à l'établissement du manager : on ne peut archiver qu'un employé du même établissement.
    const { error } = await supabase
      .from('profiles')
      .update({ archived: !!archived })
      .eq('id', params.id)
      .eq('establishment_id', estId)

    if (error) return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
