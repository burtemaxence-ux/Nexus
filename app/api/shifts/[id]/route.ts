import { createClient } from '@/lib/supabase/server'
import { ShiftUpdateSchema, validationError } from '@/lib/validations'
import { syncPlanningConformity } from '@/lib/compliance/persist'
import { getMondayOfWeek, toISODate } from '@/lib/utils/dates'
import { NextRequest, NextResponse } from 'next/server'

// Recalcule et persiste la conformité planning des couples (employé, semaine)
// touchés par une écriture. Dédup par semaine ISO ; non bloquant.
async function syncTouchedWeeks(
  establishmentId: string,
  touched: Array<{ employeeId?: string | null; date?: string | null }>,
) {
  const pairs = new Map<string, { employeeId: string; anyDateInWeek: string }>()
  for (const { employeeId, date } of touched) {
    if (!employeeId || !date) continue
    const monday = toISODate(getMondayOfWeek(new Date(date + 'T00:00:00')))
    const key = `${employeeId}|${monday}`
    if (!pairs.has(key)) pairs.set(key, { employeeId, anyDateInWeek: date })
  }
  await Promise.all(
    Array.from(pairs.values()).map((p) => syncPlanningConformity({ establishmentId, ...p })),
  )
}

async function getManagerUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { user: null, estId: null, error: 'Non authentifié', status: 401 }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, establishment_id, active_establishment_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !['manager', 'supervisor'].includes(profile.role)) {
    return { user: null, estId: null, error: 'Accès refusé', status: 403 }
  }

  const estId = profile.active_establishment_id ?? profile.establishment_id ?? null
  return { user, estId, error: null, status: 200 }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { user, estId, error: authError, status: authStatus } = await getManagerUser(supabase)

    if (!user) {
      return NextResponse.json({ error: authError }, { status: authStatus })
    }
    if (!estId) {
      return NextResponse.json({ error: 'Établissement introuvable' }, { status: 400 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID du créneau requis' }, { status: 400 })
    }

    const parsed = ShiftUpdateSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)
    const v = parsed.data

    const updateData: Record<string, string | number | null> = {}
    if (v.start_time !== undefined) updateData.start_time = v.start_time
    if (v.end_time !== undefined) updateData.end_time = v.end_time
    if (v.position !== undefined) updateData.position = v.position
    if (v.poste_id !== undefined) updateData.poste_id = v.poste_id ?? null
    if (v.break_minutes !== undefined) updateData.break_minutes = v.break_minutes
    if (v.notes !== undefined) updateData.notes = v.notes || null
    if (v.employee_id !== undefined) updateData.employee_id = v.employee_id
    if (v.date !== undefined) updateData.date = v.date

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
    }

    // État avant modif : nécessaire pour rafraîchir aussi la semaine/employé
    // d'origine si le shift change de jour ou d'employé.
    const { data: before } = await supabase
      .from('shifts')
      .select('employee_id, date')
      .eq('id', id)
      .eq('establishment_id', estId)
      .maybeSingle()

    const { error } = await supabase
      .from('shifts')
      .update(updateData)
      .eq('id', id)
      .eq('establishment_id', estId)

    if (error) {
      console.error('[shifts PATCH] error:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    // Trace de conformité planning (non bloquant) : ancien et nouvel état.
    await syncTouchedWeeks(estId, [
      { employeeId: before?.employee_id, date: before?.date },
      {
        employeeId: (updateData.employee_id as string | undefined) ?? before?.employee_id,
        date: (updateData.date as string | undefined) ?? before?.date,
      },
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[shifts PATCH] exception:', message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { user, estId, error: authError, status: authStatus } = await getManagerUser(supabase)

    if (!user) {
      return NextResponse.json({ error: authError }, { status: authStatus })
    }
    if (!estId) {
      return NextResponse.json({ error: 'Établissement introuvable' }, { status: 400 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID du créneau requis' }, { status: 400 })
    }

    // État avant suppression : pour rafraîchir la conformité de la semaine.
    const { data: before } = await supabase
      .from('shifts')
      .select('employee_id, date')
      .eq('id', id)
      .eq('establishment_id', estId)
      .is('deleted_at', null)
      .maybeSingle()

    // Soft delete — shift stays in DB for audit trail and lateness references
    const { error } = await supabase
      .from('shifts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('establishment_id', estId)
      .is('deleted_at', null)

    if (error) {
      console.error('[shifts DELETE] error:', error)
      return NextResponse.json({ error: 'Erreur lors de la suppression du shift' }, { status: 500 })
    }

    // Trace de conformité planning (non bloquant) : la suppression peut lever
    // une violation → l'instantané de la semaine est recalculé.
    if (before) {
      await syncTouchedWeeks(estId, [{ employeeId: before.employee_id, date: before.date }])
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[shifts DELETE] exception:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
