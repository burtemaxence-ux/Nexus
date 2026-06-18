import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'employee-documents'
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data, error } = await supabase
    .from('employee_documents')
    .select('*')
    .eq('employee_id', params.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  // Generate signed URLs (valid 1 hour)
  const docs = await Promise.all(
    (data ?? []).map(async (doc) => {
      const { data: signedData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.file_path, 3600)
      return { ...doc, url: signedData?.signedUrl ?? null }
    })
  )

  return NextResponse.json(docs)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, establishment_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const documentType = (formData.get('document_type') as string) || 'other'
  const name = (formData.get('name') as string) || file?.name || 'document'

  if (!file) return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Fichier trop volumineux (max 20 Mo)' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'bin'
  const filePath = `${profile.establishment_id}/${params.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: doc, error: dbError } = await supabase
    .from('employee_documents')
    .insert({
      employee_id: params.id,
      establishment_id: profile.establishment_id,
      name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      document_type: documentType,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (dbError) {
    await supabase.storage.from(BUCKET).remove([filePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(doc, { status: 201 })
}
