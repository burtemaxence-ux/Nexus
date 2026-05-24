import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest, { params }: { params: { id: string; contractId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Soft delete — preserves audit trail and foreign key references
  const { error } = await supabase
    .from('contracts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.contractId)
    .eq('employee_id', params.id)
    .is('deleted_at', null)

  if (error) return NextResponse.json({ error: 'Erreur lors de la suppression du contrat' }, { status: 500 })
  return NextResponse.json({ success: true })
}
