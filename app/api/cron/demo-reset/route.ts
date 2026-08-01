import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'

// Vercel Cron : tous les jours à 03h00 UTC → "0 3 * * *"
//
// Rejoue l'état de référence de l'établissement de démonstration. La démo est
// publique et modifiable : sans cette remise à zéro, elle dérive sous les
// modifications des visiteurs, et ses dates s'éloignent de la semaine courante
// jusqu'à ce qu'un acquéreur tombe sur un planning vide.
//
// Toute la logique vit dans `public.reset_demo_data()` (migration 088) plutôt
// qu'ici : elle est ainsi versionnée avec le schéma, exécutable à la main par
// un repreneur, et sans effet sur une base neuve où l'établissement de
// démonstration n'existe pas.
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin.rpc('reset_demo_data')

  if (error) {
    console.error('[cron/demo-reset]', error)
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }

  const row = Array.isArray(data) ? data[0] : data
  return NextResponse.json({
    ok: true,
    services: row?.services ?? 0,
    pointages: row?.pointages ?? 0,
    retards: row?.retards ?? 0,
  })
}
