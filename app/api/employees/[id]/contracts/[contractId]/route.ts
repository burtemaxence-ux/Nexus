import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { refuseDemoDeletion } from '@/lib/demo-guard'

export async function DELETE(req: NextRequest, { params }: { params: { id: string; contractId: string } }) {
  try {
    const supabase = await createClient()
    const { user, profile } = await requireManager(supabase)
    const site = profile.active_establishment_id ?? profile.establishment_id
    if (!site) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const refus = refuseDemoDeletion(user.email, 'Supprimer un contrat')
    if (refus) return refus

    const { data, error } = await supabase.from('contracts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.contractId).eq('employee_id', params.id)
      .eq('establishment_id', site).is('deleted_at', null).select('id').maybeSingle()

    if (error) return NextResponse.json({ error: 'Erreur lors de la suppression du contrat' }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }
}
