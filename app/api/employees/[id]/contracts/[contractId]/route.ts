import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest, { params }: { params: { id: string; contractId: string } }) {
  const supabase = await createClient()
  const { error } = await supabase.from('contracts').delete().eq('id', params.contractId).eq('employee_id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
