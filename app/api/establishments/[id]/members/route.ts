import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

// GET — list members of an establishment
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Verify caller has access to this establishment
  const { data: membership } = await supabaseAdmin
    .from('user_establishments')
    .select('role')
    .eq('user_id', user.id)
    .eq('establishment_id', id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('user_establishments')
    .select('user_id, role, profiles(id, full_name, email)')
    .eq('establishment_id', id)

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  type Row = { user_id: string; role: string; profiles: { id: string; full_name: string | null; email: string } | { id: string; full_name: string | null; email: string }[] | null }
  const members = (data as Row[] ?? []).map(row => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      user_id: row.user_id,
      role: row.role,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? '',
    }
  })

  return NextResponse.json(members)
}

// POST — invite a user (by email) as manager or supervisor
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Only managers of this establishment can invite
  const { data: callerMembership } = await supabaseAdmin
    .from('user_establishments')
    .select('role')
    .eq('user_id', user.id)
    .eq('establishment_id', id)
    .single()

  if (callerMembership?.role !== 'manager') {
    return NextResponse.json({ error: 'Seul un manager peut inviter des collaborateurs' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  const { email, role } = body as { email: string; role: 'manager' | 'supervisor' }
  if (!email?.trim()) return NextResponse.json({ error: 'Email requis' }, { status: 400 })
  if (!['manager', 'supervisor'].includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide (manager ou supervisor)' }, { status: 400 })
  }

  // Look up the profile by email
  const { data: target } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!target) {
    return NextResponse.json({ error: 'Aucun compte trouvé avec cet email. L\'utilisateur doit d\'abord créer un compte.' }, { status: 404 })
  }

  // Check if already a member
  const { data: existing } = await supabaseAdmin
    .from('user_establishments')
    .select('id')
    .eq('user_id', target.id)
    .eq('establishment_id', id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Cet utilisateur a déjà accès à cet établissement' }, { status: 409 })
  }

  const { error } = await supabaseAdmin
    .from('user_establishments')
    .insert({ user_id: target.id, establishment_id: id, role })

  if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })

  return NextResponse.json({ user_id: target.id, full_name: target.full_name, email: target.email, role }, { status: 201 })
}
