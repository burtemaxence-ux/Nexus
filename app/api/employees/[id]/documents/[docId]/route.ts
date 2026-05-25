import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'employee-documents'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { data: doc, error: fetchError } = await supabase
    .from('employee_documents')
    .select('file_path')
    .eq('id', params.docId)
    .eq('employee_id', params.id)
    .single()

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
  }

  await supabase.storage.from(BUCKET).remove([doc.file_path])

  const { error: dbError } = await supabase
    .from('employee_documents')
    .delete()
    .eq('id', params.docId)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
