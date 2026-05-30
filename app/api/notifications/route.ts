import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/notifications
// Query params: ?unread_only=true, ?limit=20
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10))

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) query = query.eq('read', false)

    const { data: notifications, error, count: totalCount } = await query

    if (error) {
      console.error('[notifications GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { count: unreadCount, error: countError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (countError) {
      console.error('[notifications GET count]', countError)
    }

    const hasMore = (offset + limit) < (totalCount ?? 0)

    return NextResponse.json({
      notifications: notifications ?? [],
      unread_count: unreadCount ?? 0,
      total_count: totalCount ?? 0,
      has_more: hasMore,
    })
  } catch (err) {
    console.error('[notifications GET] unexpected', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/notifications
// Réservé aux managers et superviseurs. Vérifie que tous les user_ids cibles
// appartiennent au même établissement que l'appelant.
// Body: { user_ids: string[], establishment_id: string, type: string, title: string, body: string, data?: object, action_url?: string }
export async function POST(request: NextRequest) {
  try {
    // --- Authentification & autorisation ---
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, establishment_id, active_establishment_id')
      .eq('id', user.id)
      .single()

    if (!callerProfile || !['manager', 'supervisor'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const callerEstablishmentId: string | null =
      callerProfile.active_establishment_id ?? callerProfile.establishment_id ?? null

    if (!callerEstablishmentId) {
      return NextResponse.json({ error: 'Établissement introuvable' }, { status: 403 })
    }

    // --- Validation du body ---
    const body = await request.json()
    const { user_ids, establishment_id, type, title, body: notifBody, data, action_url } = body

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ error: 'user_ids requis' }, { status: 400 })
    }
    if (!type || !title || !notifBody) {
      return NextResponse.json({ error: 'type, title et body requis' }, { status: 400 })
    }

    // --- Vérification périmètre établissement ---
    const { data: targetProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, establishment_id, active_establishment_id')
      .in('id', user_ids)

    const outsiders = (user_ids as string[]).filter((uid) => {
      const profile = (targetProfiles ?? []).find((p: { id: string; establishment_id: string | null; active_establishment_id: string | null }) => p.id === uid)
      if (!profile) return true
      const estId = profile.active_establishment_id ?? profile.establishment_id
      return estId !== callerEstablishmentId
    })

    if (outsiders.length > 0) {
      return NextResponse.json(
        { error: 'Un ou plusieurs destinataires ne font pas partie de votre établissement' },
        { status: 403 },
      )
    }

    // --- Insertion ---
    const rows = user_ids.map((uid: string) => ({
      user_id: uid,
      establishment_id: establishment_id ?? callerEstablishmentId,
      type,
      title,
      body: notifBody,
      data: data ?? {},
      action_url: action_url ?? null,
    }))

    const { error } = await supabaseAdmin.from('notifications').insert(rows)

    if (error) {
      console.error('[notifications POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ created: rows.length })
  } catch (err) {
    console.error('[notifications POST] unexpected', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
