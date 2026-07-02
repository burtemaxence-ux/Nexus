import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { isUuid } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'

// GET  — liste des alertes conformité actives de l'établissement
// PATCH — ignore une alerte pendant 7 jours  { id, action: 'ignore' }

export async function GET(_req: NextRequest) {
  try {
  const supabase = await createClient()
  const { profile } = await requireManager(supabase)

  const establishmentId = profile.active_establishment_id ?? profile.establishment_id
  if (!establishmentId) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 400 })

  const now = new Date().toISOString()

  // Alertes actives (ignored_until passé ou null)
  const { data: alerts, error } = await supabase
    .from('compliance_alerts')
    .select(`
      id, type, level, title, message, options, status, ignored_until, created_at,
      employee_id,
      profiles:employee_id ( id, full_name, position )
    `)
    .eq('establishment_id', establishmentId)
    .eq('status', 'active')
    // La conformité planning (type 'planning_conformity') est déjà affichée en
    // direct sur la page Alertes via checkCompliance ; on l'exclut ici pour ne
    // pas dupliquer. Les lignes persistées servent de trace serveur / audit.
    .neq('type', 'planning_conformity')
    .or(`ignored_until.is.null,ignored_until.lt.${now}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  // Tri : CRITICAL → WARNING → INFO
  const levelOrder: Record<string, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 }
  const sorted = (alerts ?? []).sort((a, b) =>
    (levelOrder[a.level] ?? 9) - (levelOrder[b.level] ?? 9)
  )

  return NextResponse.json({ alerts: sorted, count: sorted.length })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}

export async function PATCH(req: NextRequest) {
  try {
  const supabase = await createClient()
  const { user, profile } = await requireManager(supabase)
  if (profile.role !== 'manager') {
    return NextResponse.json({ error: 'Managers uniquement' }, { status: 403 })
  }

  const establishmentId = profile.active_establishment_id ?? profile.establishment_id
  const { id, action, status } = await req.json().catch(() => ({})) as { id?: string; action?: string; status?: string }

  if (!isUuid(id)) return NextResponse.json({ error: 'id invalide' }, { status: 400 })
  if (action !== undefined && action !== 'ignore') return NextResponse.json({ error: 'action invalide' }, { status: 400 })
  if (status !== undefined && !['active', 'resolved'].includes(status)) return NextResponse.json({ error: 'statut invalide' }, { status: 400 })

  if (action === 'ignore') {
    const ignoredUntil = new Date(Date.now() + 7 * 86400000).toISOString()
    const { error } = await supabase
      .from('compliance_alerts')
      .update({ ignored_until: ignoredUntil })
      .eq('id', id)
      .eq('establishment_id', establishmentId)

    if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return NextResponse.json({ ok: true, ignored_until: ignoredUntil })
  }

  if (status) {
    const { error } = await supabase
      .from('compliance_alerts')
      .update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null, resolved_by: status === 'resolved' ? user.id : null })
      .eq('id', id)
      .eq('establishment_id', establishmentId)

    if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'action ou status requis' }, { status: 400 })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}
