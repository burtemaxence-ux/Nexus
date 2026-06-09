import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { hashPin } from '@/lib/pin'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)

    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''

    const { data: target } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', params.id)
      .eq('establishment_id', estId)
      .single()

    if (!target) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })

    const body = await request.json()
    const { full_name, position, contract_type, weekly_hours, phone, pay_ref, pin, disability } = body

    const pinHash = pin ? await hashPin(pin) : undefined

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name, position, contract_type, weekly_hours, phone, pay_ref,
        ...(pinHash !== undefined && { pin: pinHash }),
        disability, updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)

    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''

    const { data: target } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', params.id)
      .eq('establishment_id', estId)
      .single()

    if (!target) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })

    // Deleting the auth user cascades to profiles → shifts → leave_requests
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(params.id)
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
