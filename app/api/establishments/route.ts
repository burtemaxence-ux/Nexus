import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_establishments')
    .select('establishment_id, role, establishments(id, name)')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const establishments = (data ?? []).map(row => {
    const est = (Array.isArray(row.establishments) ? row.establishments[0] : row.establishments) as
      { id: string; name: string } | null
    return { id: est?.id ?? '', name: est?.name ?? '', role: row.role }
  })

  return NextResponse.json(establishments)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') {
    return NextResponse.json({ error: 'Seul un manager peut créer un établissement' }, { status: 403 })
  }

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  const { data: est, error: estError } = await supabase
    .from('establishments')
    .insert({ name: name.trim(), owner_id: user.id })
    .select('id, name')
    .single()

  if (estError) return NextResponse.json({ error: estError.message }, { status: 500 })

  await supabase.from('user_establishments').insert({
    user_id: user.id,
    establishment_id: est.id,
    role: 'manager',
  })

  return NextResponse.json(est, { status: 201 })
}
