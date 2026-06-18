import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateToken } from '@/lib/api-token'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, establishment_id, active_establishment_id').eq('id', user.id).single()
  if (!['manager', 'supervisor'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const establishmentId = profile!.active_establishment_id ?? profile!.establishment_id

  const { data } = await supabaseAdmin
    .from('api_tokens')
    .select('id, name, last_used_at, created_at')
    .eq('establishment_id', establishmentId)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, establishment_id, active_establishment_id').eq('id', user.id).single()
  if (profile?.role !== 'manager') {
    return NextResponse.json({ error: 'Seul un manager peut créer des tokens' }, { status: 403 })
  }

  const establishmentId = profile.active_establishment_id ?? profile.establishment_id

  // Limit to 5 tokens per establishment
  const { count } = await supabaseAdmin
    .from('api_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('establishment_id', establishmentId)

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'Limite atteinte (5 tokens maximum). Supprimez-en un d\'abord.' }, { status: 400 })
  }

  const { name } = await req.json() as { name?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  const { raw, hash } = generateToken()

  const { data, error } = await supabaseAdmin
    .from('api_tokens')
    .insert({
      establishment_id: establishmentId,
      user_id: user.id,
      name: name.trim(),
      token_hash: hash,
    })
    .select('id, name, created_at')
    .single()

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  // Return the raw token ONCE — never stored
  return NextResponse.json({ ...data, raw_token: raw }, { status: 201 })
}
