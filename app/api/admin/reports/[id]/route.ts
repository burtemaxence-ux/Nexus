import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isOperator } from '@/lib/operator'

const schema = z.object({ status: z.enum(['new', 'resolved']) })

// PATCH /api/admin/reports/:id — change le statut d'un signalement. Réservé à l'opérateur.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isOperator(user.email)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }

  const { id } = await params
  const { error } = await supabaseAdmin
    .from('support_reports')
    .update({ status: parsed.data.status })
    .eq('id', id)

  if (error) {
    console.error('[admin reports PATCH]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
