import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AuthProfile = {
  id: string
  role: string
  establishment_id: string | null
  active_establishment_id: string | null
}

export type AuthResult = {
  user: { id: string; email?: string }
  profile: AuthProfile
}

/**
 * Verifies the request has an authenticated session.
 * Throws a NextResponse 401 if not.
 */
export async function requireAuth(supabase: SupabaseClient): Promise<AuthResult> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, establishment_id, active_establishment_id')
    .eq('id', user.id)
    .single()

  if (!profile) throw NextResponse.json({ error: 'Profil introuvable' }, { status: 401 })

  return { user, profile }
}

/**
 * Verifies the request is authenticated AND the user is manager or supervisor.
 * Throws NextResponse 401 or 403 otherwise.
 */
export async function requireManager(supabase: SupabaseClient): Promise<AuthResult> {
  const result = await requireAuth(supabase)
  if (!['manager', 'supervisor'].includes(result.profile.role)) {
    throw NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  return result
}

/**
 * Verifies the request is authenticated AND the user is an employee.
 * Throws NextResponse 401 or 403 otherwise.
 */
export async function requireEmployee(supabase: SupabaseClient): Promise<AuthResult> {
  const result = await requireAuth(supabase)
  if (result.profile.role !== 'employee') {
    throw NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  return result
}
