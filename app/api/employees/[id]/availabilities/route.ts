import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)

    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''

    const { data: emp } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', params.id)
      .eq('establishment_id', estId)
      .single()

    if (!emp) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })

    const { data, error } = await supabase
      .from('availabilities')
      .select('*')
      .eq('employee_id', params.id)
      .order('day_of_week')
    if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)

    const estId = profile.active_establishment_id ?? profile.establishment_id ?? ''

    const { data: emp } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', params.id)
      .eq('establishment_id', estId)
      .single()

    if (!emp) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })

    const body: Array<{ day_of_week: number; start_time: string; end_time: string }> = await req.json()

    await supabase.from('availabilities').delete().eq('employee_id', params.id)

    if (body.length > 0) {
      const { error } = await supabase.from('availabilities').insert(
        body.map(a => ({ employee_id: params.id, day_of_week: a.day_of_week, start_time: a.start_time, end_time: a.end_time }))
      )
      if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
