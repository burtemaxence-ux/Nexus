import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const v = row[h]
        const s = v === null || v === undefined ? '' : String(v)
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s
      }).join(',')
    ),
  ]
  return lines.join('\n')
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, establishment_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const estId = profile.establishment_id!
  const since = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString()

  const [profilesRes, shiftsRes, leavesRes, presencesRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, role, position, contract_type, created_at').eq('establishment_id', estId),
    supabase.from('shifts').select('id, employee_id, date, start_time, end_time, break_minutes, status').eq('establishment_id', estId).gte('date', since.slice(0, 10)),
    supabase.from('leave_requests').select('id, employee_id, type, start_date, end_date, status, created_at').eq('establishment_id', estId).gte('created_at', since),
    supabase.from('presences').select('id, employee_id, date, clock_in, clock_out').eq('establishment_id', estId).gte('date', since.slice(0, 10)),
  ])

  const sections = [
    '## Employés\n' + toCsv((profilesRes.data ?? []) as Record<string, unknown>[]),
    '## Shifts (12 derniers mois)\n' + toCsv((shiftsRes.data ?? []) as Record<string, unknown>[]),
    '## Congés (12 derniers mois)\n' + toCsv((leavesRes.data ?? []) as Record<string, unknown>[]),
    '## Présences (12 derniers mois)\n' + toCsv((presencesRes.data ?? []) as Record<string, unknown>[]),
  ]

  const csv = sections.join('\n\n')
  const filename = `export-rgpd-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
