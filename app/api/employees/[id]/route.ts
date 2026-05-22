import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

async function getManagerOrError() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'manager')
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }

  return { supabase }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, error } = await getManagerOrError()
  if (error) return error

  const body = await request.json()
  const { full_name, position, contract_type, weekly_hours } = body

  const { error: updateError } = await supabase!
    .from('profiles')
    .update({ full_name, position, contract_type, weekly_hours, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await getManagerOrError()
  if (error) return error

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Deleting the auth user cascades to profiles → shifts → leave_requests
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(params.id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
