import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, establishment_id, active_establishment_id').eq('id', user.id).single()
  if (!profile || !['manager', 'supervisor'].includes(profile.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const establishmentId = profile.active_establishment_id ?? profile.establishment_id

  const { data, error } = await supabaseAdmin
    .from('webhook_logs')
    .select('id, event, target, url, status_code, success, duration_ms, attempts, created_at')
    .eq('establishment_id', establishmentId)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data ?? [])
}
