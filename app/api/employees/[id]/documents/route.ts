import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { EMPLOYEE_DOCUMENTS_BUCKET, isEmployeeDocumentPath } from '@/lib/employee-documents'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { user, profile } = await requireAuth(supabase)
    const site = profile.active_establishment_id ?? profile.establishment_id
    if (!site || (params.id !== user.id && !['manager', 'supervisor'].includes(profile.role))) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', params.id)
      .eq('establishment_id', site)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

    const scopedDocuments = (data ?? []).filter(doc => isEmployeeDocumentPath(doc.file_path, site, params.id))
    const docs = await Promise.all(scopedDocuments.map(async (doc) => {
      const { data: signed } = await supabaseAdmin.storage
        .from(EMPLOYEE_DOCUMENTS_BUCKET).createSignedUrl(doc.file_path, 3600)
      return { ...doc, url: signed?.signedUrl ?? null }
    }))
    return NextResponse.json(docs)
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { user, profile } = await requireAuth(supabase)
    const site = profile.active_establishment_id ?? profile.establishment_id
    if (!site || profile.role !== 'manager') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: employee, error: employeeError } = await supabase.from('profiles').select('id')
      .eq('id', params.id).eq('establishment_id', site).maybeSingle()
    if (employeeError) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    if (!employee) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Fichier trop volumineux (max 20 Mo)' }, { status: 400 })

    const requestedType = formData.get('document_type')
    const requestedName = formData.get('name')
    const documentType = typeof requestedType === 'string' && requestedType ? requestedType : 'other'
    const name = typeof requestedName === 'string' && requestedName ? requestedName : file.name || 'document'
    const ext = file.name.match(/\.([a-z0-9]{1,12})$/i)?.[1] ?? 'bin'
    const filePath = `${site}/${employee.id}/${randomUUID()}.${ext}`
    const storage = supabaseAdmin.storage.from(EMPLOYEE_DOCUMENTS_BUCKET)
    const { error: uploadError } = await storage.upload(filePath, await file.arrayBuffer(), {
      contentType: file.type, upsert: false,
    })
    if (uploadError) return NextResponse.json({ error: 'Impossible de déposer le fichier' }, { status: 500 })

    const { data: doc, error: dbError } = await supabase.from('employee_documents').insert({
      employee_id: employee.id,
      establishment_id: site,
      name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      document_type: documentType,
      uploaded_by: user.id,
    }).select().single()

    if (dbError) {
      const { error: cleanupError } = await storage.remove([filePath])
      if (cleanupError) console.error('[employee-documents] upload cleanup failed:', cleanupError.name)
      return NextResponse.json({ error: 'Impossible d’enregistrer le document' }, { status: 500 })
    }
    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }
}
