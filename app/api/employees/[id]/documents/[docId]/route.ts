import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { refuseDemoDeletion } from '@/lib/demo-guard'
import { EMPLOYEE_DOCUMENTS_BUCKET, isEmployeeDocumentPath } from '@/lib/employee-documents'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const supabase = await createClient()
    const { user, profile } = await requireAuth(supabase)
    const site = profile.active_establishment_id ?? profile.establishment_id
    if (!site || profile.role !== 'manager') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const refusal = refuseDemoDeletion(user.email, 'Supprimer un document')
    if (refusal) return refusal

    const { data: doc, error: fetchError } = await supabase.from('employee_documents').select('file_path')
      .eq('id', params.docId).eq('employee_id', params.id).eq('establishment_id', site).maybeSingle()
    if (fetchError) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    if (!doc || !isEmployeeDocumentPath(doc.file_path, site, params.id)) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }

    const { error: storageError } = await supabaseAdmin.storage
      .from(EMPLOYEE_DOCUMENTS_BUCKET).remove([doc.file_path])
    if (storageError) return NextResponse.json({ error: 'Impossible de supprimer le fichier' }, { status: 500 })

    const { error: dbError } = await supabase.from('employee_documents').delete()
      .eq('id', params.docId).eq('employee_id', params.id).eq('establishment_id', site)
      .eq('file_path', doc.file_path)

    if (dbError) return NextResponse.json({ error: 'Impossible de supprimer le document' }, { status: 500 })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }
}
