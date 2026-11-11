import { NextRequest } from 'next/server'
import { expect, it, vi } from 'vitest'
import { requireManager } from '@/lib/api-auth'
import { createClient } from '@/lib/supabase/server'
import { GET } from './route'

vi.mock('@/lib/api-auth', () => ({ requireManager: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/exports/pdf', () => ({ renderReportPdf: vi.fn() }))

it('limite les salariés et leurs heures à l’établissement actif dans le CSV', async () => {
  const site = 'site-actif'
  const other = 'autre-site'
  vi.mocked(requireManager).mockResolvedValue({
    user: { id: 'manager' },
    profile: { id: 'manager', role: 'manager', active_establishment_id: site, establishment_id: other },
  })
  const employee = { id: 'employee', full_name: 'Salarié test', email: 'test@example.com', establishment_id: site }
  const rows = {
    profiles: [employee, { ...employee, id: 'other', full_name: 'Salarié autre site', establishment_id: other }],
    shifts: [
      { employee_id: employee.id, start_time: '09:00', end_time: '12:00', break_minutes: 0, establishment_id: site },
      { employee_id: employee.id, start_time: '12:00', end_time: '16:00', break_minutes: 0, establishment_id: other },
    ],
    presences: [
      { employee_id: employee.id, clock_in: '2026-11-09T09:00:00Z', clock_out: '2026-11-09T11:00:00Z', break_minutes_used: 0, establishment_id: site },
      { employee_id: employee.id, clock_in: '2026-11-09T12:00:00Z', clock_out: '2026-11-09T16:00:00Z', break_minutes_used: 0, establishment_id: other },
    ],
  }

  const from = vi.fn((table: keyof typeof rows) => {
    let data: { establishment_id: string }[] = rows[table]
    const query = {
      select: () => query,
      eq: (column: string, value: string | boolean) => {
        if (column === 'establishment_id') data = data.filter(row => row.establishment_id === value)
        return query
      },
      order: () => query,
      gte: () => query,
      lte: () => query,
      is: () => query,
      then: (resolve: (result: { data: typeof data; error: null }) => void) => resolve({ data, error: null }),
    }
    return query
  })
  vi.mocked(createClient).mockResolvedValue({ from } as unknown as Awaited<ReturnType<typeof createClient>>)

  const response = await GET(new NextRequest('http://localhost/api/exports?from=2026-11-09&to=2026-11-15'))
  expect(response.status).toBe(200)
  const csv = await response.text()
  expect(csv.split('\r\n').slice(1)).toEqual(['Salarié test,test@example.com,,,,3h,2h,,'])
})
