import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { extractCalendarEmployeeId, verifyCalendarToken, generateICS } from '@/lib/integrations/ical'
import type { Shift } from '@/types'

// Flux consommé par Google/Apple Calendar : pas de cookies, pas de session.
// Le contrôle d'accès EST le token (HMAC versionné par profil — révocable via
// /api/calendar/regenerate). Les lectures passent par le service role : la RLS
// (réservée au rôle authenticated) rendrait le flux vide pour un lecteur anonyme.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const employeeId = extractCalendarEmployeeId(params.token)
    if (!employeeId) {
      return new NextResponse('Token invalide', { status: 401 })
    }

    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, establishment_id, calendar_token_version')
      .eq('id', employeeId)
      .maybeSingle()

    if (!profileData || !verifyCalendarToken(params.token, employeeId, profileData.calendar_token_version ?? 1)) {
      return new NextResponse('Token invalide', { status: 401 })
    }

    const [{ data: shiftsData }, { data: orgData }] = await Promise.all([
      supabaseAdmin.from('shifts')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'published')
        .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
        .lte('date', new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10))
        .order('date', { ascending: true }),
      supabaseAdmin.from('settings')
        .select('value')
        .eq('key', 'organisation_name')
        .eq('establishment_id', profileData.establishment_id)
        .maybeSingle(),
    ])

    const employeeName = profileData.full_name ?? profileData.email ?? 'Employé'
    const orgName = orgData?.value ?? 'Quartzbase'
    const shifts = (shiftsData ?? []) as Shift[]

    const ics = generateICS(shifts, employeeName, orgName)

    return new NextResponse(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="planning-quartzbase.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
}
