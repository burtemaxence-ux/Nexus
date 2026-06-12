import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseCalendarToken, generateICS } from '@/lib/integrations/ical'
import type { Shift } from '@/types'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const employeeId = parseCalendarToken(params.token)
    if (!employeeId) {
      return new NextResponse('Token invalide', { status: 401 })
    }

    const supabase = await createClient()

    const [{ data: profileData }, { data: shiftsData }, { data: orgData }] = await Promise.all([
      supabase.from('profiles').select('full_name, email').eq('id', employeeId).single(),
      supabase.from('shifts')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'published')
        .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
        .lte('date', new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10))
        .order('date', { ascending: true }),
      supabase.from('settings').select('value').eq('key', 'organisation_name').single(),
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
