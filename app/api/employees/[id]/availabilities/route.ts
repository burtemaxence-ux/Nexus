import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('availabilities')
    .select('*')
    .eq('employee_id', params.id)
    .order('day_of_week')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const body: Array<{ day_of_week: number; start_time: string; end_time: string }> = await req.json()

  // Delete existing then insert new ones
  await supabase.from('availabilities').delete().eq('employee_id', params.id)

  if (body.length > 0) {
    const { error } = await supabase.from('availabilities').insert(
      body.map(a => ({ employee_id: params.id, day_of_week: a.day_of_week, start_time: a.start_time, end_time: a.end_time }))
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
