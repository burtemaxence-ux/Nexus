import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    await requireManager(supabase)

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, position, contract_type, weekly_hours')
      .eq('role', 'employee')
      .eq('archived', false)
      .order('full_name', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
