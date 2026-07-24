import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { parseCalendarToken, generateICS } from '@/lib/integrations/ical'
import type { Shift } from '@/types'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const employeeId = parseCalendarToken(params.token)
    if (!employeeId) {
      return new NextResponse('Token invalide', { status: 401 })
    }

    // Flux ICS non authentifié : le token HMAC signé est la preuve d'accès.
    // On lit via le client service-role, sinon les policies RLS (TO authenticated)
    // renverraient zéro ligne pour cette requête anon → calendrier vide.
    // On scope explicitement par l'employeeId vérifié par le token.
    const { data: profileData } = await supabaseAdmin
      .from('profiles').select('full_name, email, establishment_id').eq('id', employeeId).single()

    const estId = profileData?.establishment_id ?? null

    const [{ data: shiftsData }, { data: orgData }] = await Promise.all([
      supabaseAdmin.from('shifts')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'published')
        .is('deleted_at', null)
        .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
        .lte('date', new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10))
        .order('date', { ascending: true }),
      estId
        ? supabaseAdmin.from('settings').select('value').eq('establishment_id', estId).eq('key', 'establishment_name').maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const employeeName = profileData?.full_name ?? profileData?.email ?? 'Employé'
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
