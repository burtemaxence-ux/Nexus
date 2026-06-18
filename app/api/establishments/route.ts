import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { user } = await requireAuth(supabase)

    const { data, error } = await supabase
      .from('user_establishments')
      .select('establishment_id, role, establishments(id, name)')
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

    const establishments = (data ?? []).map(row => {
      const est = (Array.isArray(row.establishments) ? row.establishments[0] : row.establishments) as
        { id: string; name: string } | null
      return { id: est?.id ?? '', name: est?.name ?? '', role: row.role }
    })

    return NextResponse.json(establishments)
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { user, profile } = await requireAuth(supabase)

    if (profile.role !== 'manager') {
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
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
