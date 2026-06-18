import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/notifications/read
// Body: { id?: string, all?: boolean }
// Marque une notification spécifique (id) ou toutes (all: true) comme lues.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { id, all } = body

    if (!id && !all) {
      return NextResponse.json({ error: 'id ou all requis' }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (all) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: now })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) {
        console.error('[notifications/read POST all]', error)
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    // Mark single notification as read — RLS guarantees user_id match
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: now })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[notifications/read POST id]', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[notifications/read POST] unexpected', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
