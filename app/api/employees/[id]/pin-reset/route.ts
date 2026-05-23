import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const newPin = String(Math.floor(1000 + Math.random() * 9000))
  const { error } = await supabase.from('profiles').update({ pin: newPin }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pin: newPin })
}
