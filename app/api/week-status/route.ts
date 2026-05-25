import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { fireWebhook } from '@/lib/integrations/webhook'
import { getWeekLabel, getWeekDates } from '@/lib/utils/dates'
import { sendPlanningPublishedEmails } from '@/lib/email/planning-email'
import type { Profile, Shift } from '@/types'

async function getManagerUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { user: null, profile: null, error: 'Non authentifié', status: 401 }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, establishment_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !['manager', 'supervisor'].includes(profile.role)) {
    return { user: null, profile: null, error: 'Accès refusé', status: 403 }
  }

  return { user, profile, error: null, status: 200 }
}

// GET : récupère le statut d'une semaine
// Query param: week_monday (YYYY-MM-DD)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const weekMonday = searchParams.get('week_monday')

    if (!weekMonday) {
      return NextResponse.json({ error: 'week_monday requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('week_status')
      .select('*')
      .eq('week_monday', weekMonday)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine (week not yet created)
      console.error('[week-status GET] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Si pas encore de statut, retourner les valeurs par défaut
    if (!data) {
      return NextResponse.json({
        week_monday: weekMonday,
        published: false,
        locked: false,
        published_at: null,
        locked_at: null,
      })
    }

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[week-status GET] exception:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST : upsert le statut d'une semaine
// Body: { week_monday: string, published?: boolean, locked?: boolean }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { user, profile, error: authError, status: authStatus } = await getManagerUser(supabase)

    if (!user) {
      return NextResponse.json({ error: authError }, { status: authStatus })
    }

    const body = await request.json()
    const { week_monday, published, locked } = body as {
      week_monday: string
      published?: boolean
      locked?: boolean
    }

    if (!week_monday) {
      return NextResponse.json({ error: 'week_monday requis' }, { status: 400 })
    }

    // Récupérer le statut actuel pour merger
    const { data: existing } = await supabase
      .from('week_status')
      .select('*')
      .eq('week_monday', week_monday)
      .single()

    const upsertData: Record<string, unknown> = {
      establishment_id: profile!.establishment_id,
      week_monday,
      published: existing?.published ?? false,
      locked: existing?.locked ?? false,
      published_at: existing?.published_at ?? null,
      locked_at: existing?.locked_at ?? null,
    }

    if (published !== undefined) {
      upsertData.published = published
      if (published && !existing?.published_at) {
        upsertData.published_at = new Date().toISOString()
      } else if (!published) {
        upsertData.published_at = null
      }
    }

    if (locked !== undefined) {
      upsertData.locked = locked
      if (locked && !existing?.locked_at) {
        upsertData.locked_at = new Date().toISOString()
      } else if (!locked) {
        upsertData.locked_at = null
      }
    }

    const { data, error } = await supabase
      .from('week_status')
      .upsert(upsertData, { onConflict: 'establishment_id,week_monday' })
      .select()
      .single()

    if (error) {
      console.error('[week-status POST] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fire webhook + send emails when planning is published for the first time
    if (published === true && !existing?.published) {
      const weekLabel = getWeekLabel(getWeekDates(new Date(week_monday + 'T00:00:00')))
      const [{ count }, { data: settingsData }, { data: employees }, { data: weekShifts }] = await Promise.all([
        supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('week_monday', week_monday),
        supabase.from('settings').select('key, value'),
        supabase.from('profiles').select('id, full_name, email, establishment_id').eq('establishment_id', profile!.establishment_id).eq('role', 'employee').eq('archived', false),
        supabase.from('shifts').select('*').eq('week_monday', week_monday),
      ])
      const settings: Record<string, string> = {}
      for (const row of settingsData ?? []) settings[row.key] = row.value
      fireWebhook(settings, 'planning.published', { weekLabel, weekMonday: week_monday, employeeCount: count ?? 0 }).catch(() => {})
      sendPlanningPublishedEmails({
        employees: (employees ?? []) as unknown as Profile[],
        shifts: (weekShifts ?? []) as unknown as Shift[],
        weekLabel,
      }).catch(() => {})
    }

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[week-status POST] exception:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
