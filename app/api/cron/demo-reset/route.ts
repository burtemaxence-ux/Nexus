import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { syncPlanningConformity } from '@/lib/compliance/persist'
import { DEMO_ESTABLISHMENT_ID } from '@/lib/demo'

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

  // Les alertes de conformité sont purgées avec le reste : sans cette étape,
  // l'écran Conformité — que la visite guidée présente comme le cœur du
  // produit — resterait vide jusqu'au contrôle hebdomadaire du dimanche soir.
  //
  // On les fait recalculer par le VRAI moteur plutôt que de les reproduire en
  // SQL : les 17 règles restent la seule source de vérité, et ce qui s'affiche
  // en démonstration est réellement calculé à partir du planning restauré.
  let alertes = 0
  try {
    const { data: emps } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('establishment_id', DEMO_ESTABLISHMENT_ID)
      .eq('role', 'employee')

    const { data: weeks } = await supabaseAdmin
      .from('week_status')
      .select('week_monday')
      .eq('establishment_id', DEMO_ESTABLISHMENT_ID)

    for (const emp of emps ?? []) {
      for (const w of weeks ?? []) {
        await syncPlanningConformity({
          establishmentId: DEMO_ESTABLISHMENT_ID,
          employeeId: emp.id as string,
          anyDateInWeek: w.week_monday as string,
        })
        alertes++
      }
    }
  } catch (e) {
    // Non bloquant : la remise à zéro des données a déjà réussi.
    console.error('[cron/demo-reset] conformité', e)
  }

  return NextResponse.json({
    ok: true,
    services: row?.services ?? 0,
    pointages: row?.pointages ?? 0,
    retards: row?.retards ?? 0,
    semainesAnalysees: alertes,
  })
}
