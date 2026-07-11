import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { ShiftSchema } from '@/lib/validations'
import { syncPlanningConformity } from '@/lib/compliance/persist'
import { overlapsAny, type ShiftTimes } from '@/lib/planning/overlap'
import { getMondayOfWeek, toISODate } from '@/lib/utils/dates'
import { NextRequest, NextResponse } from 'next/server'

// Création GROUPÉE de créneaux (auto-planning). Remplace la boucle client de N
// POST /api/shifts (N allers-retours + N synchros de conformité) par :
//   - une seule insertion,
//   - une seule synchro de conformité PAR employé/semaine (pas par créneau),
//   - un skip des chevauchements (avec l'existant ET entre créneaux du lot).
export const maxDuration = 60

const MAX_BULK = 200

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { profile } = await requireManager(supabase)
    const establishmentId = profile.active_establishment_id ?? profile.establishment_id

    const raw = await request.json().catch(() => null)
    const input = Array.isArray(raw?.shifts) ? raw.shifts : null
    if (!input) return NextResponse.json({ error: 'shifts requis (tableau)' }, { status: 400 })
    if (input.length === 0) return NextResponse.json({ created: 0, skipped: 0 }, { status: 201 })
    if (input.length > MAX_BULK) return NextResponse.json({ error: `Trop de créneaux (max ${MAX_BULK})` }, { status: 400 })

    // Valide chaque créneau ; on ignore silencieusement les invalides (comptés
    // comme skipped) plutôt que de rejeter tout le lot pour un seul mauvais.
    type ShiftData = import('zod').infer<typeof ShiftSchema>
    const valid: ShiftData[] = []
    for (const item of input) {
      const parsed = ShiftSchema.safeParse(item)
      if (parsed.success) valid.push(parsed.data)
    }
    const invalidCount = input.length - valid.length
    if (valid.length === 0) return NextResponse.json({ error: 'Aucun créneau valide' }, { status: 422 })

    // Employés visibles pour ce manager (RLS scope l'établissement) : un
    // employee_id d'un autre tenant renvoie null → créneau ignoré.
    const empIds = Array.from(new Set(valid.map(v => v.employee_id)))
    const { data: emps } = await supabase.from('profiles').select('id').in('id', empIds)
    const allowed = new Set((emps ?? []).map((e: { id: string }) => e.id))

    // Créneaux déjà en base pour ces employés sur la plage de dates concernée :
    // sert à détecter les chevauchements sans réinsérer un doublon.
    const dates = valid.map(v => v.date).sort()
    const { data: existing } = await supabase
      .from('shifts')
      .select('employee_id, date, start_time, end_time')
      .in('employee_id', empIds)
      .gte('date', dates[0])
      .lte('date', dates[dates.length - 1])
      .is('deleted_at', null)
    const existingByEmp = new Map<string, ShiftTimes[]>()
    for (const e of (existing ?? []) as (ShiftTimes & { employee_id: string })[]) {
      const list = existingByEmp.get(e.employee_id) ?? []
      list.push(e)
      existingByEmp.set(e.employee_id, list)
    }

    // Sélection : employé autorisé + aucun chevauchement (existant ou déjà
    // accepté dans ce lot). Les créneaux écartés sont comptés dans `skipped`.
    const acceptedByEmp = new Map<string, ShiftTimes[]>()
    const toInsert: Record<string, unknown>[] = []
    let skipped = invalidCount
    for (const v of valid) {
      if (!allowed.has(v.employee_id)) { skipped++; continue }
      const ref = [...(existingByEmp.get(v.employee_id) ?? []), ...(acceptedByEmp.get(v.employee_id) ?? [])]
      if (overlapsAny(v, ref)) { skipped++; continue }
      toInsert.push({
        employee_id: v.employee_id,
        date: v.date,
        start_time: v.start_time,
        end_time: v.end_time,
        position: v.position || null,
        poste_id: v.poste_id ?? null,
        break_minutes: v.break_minutes ?? 0,
        notes: v.notes || null,
        status: 'draft',
      })
      const acc = acceptedByEmp.get(v.employee_id) ?? []
      acc.push(v)
      acceptedByEmp.set(v.employee_id, acc)
    }

    let created = 0
    if (toInsert.length > 0) {
      const { data, error } = await supabase.from('shifts').insert(toInsert).select('id')
      if (error) {
        console.error('[shifts/bulk] insert error:', error)
        return NextResponse.json({ error: 'Erreur lors de l’enregistrement des créneaux' }, { status: 500 })
      }
      created = data?.length ?? 0
    }

    // UNE synchro de conformité par (employé, semaine ISO), pas par créneau.
    // Non bloquant (ne jette jamais, cf. persist.ts).
    if (establishmentId && created > 0) {
      const seen = new Set<string>()
      for (const s of toInsert) {
        const employeeId = s.employee_id as string
        const date = s.date as string
        const monday = toISODate(getMondayOfWeek(new Date(date + 'T00:00:00')))
        const key = `${employeeId}__${monday}`
        if (seen.has(key)) continue
        seen.add(key)
        await syncPlanningConformity({ establishmentId, employeeId, anyDateInWeek: date })
      }
    }

    return NextResponse.json({ created, skipped }, { status: 201 })
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    console.error('[shifts/bulk] exception:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
