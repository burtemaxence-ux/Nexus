import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePin, hashPin } from '@/lib/pin'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const newPin = generatePin()
  const pinHash = await hashPin(newPin)
  const { error } = await supabase.from('profiles').update({ pin: pinHash }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Return the plain PIN once for display — never return the hash
  return NextResponse.json({ pin: newPin })
}
