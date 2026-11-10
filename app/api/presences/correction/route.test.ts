import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requireAuth } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { GET, POST } from './route'

vi.mock('@/lib/api-auth', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { rpc: vi.fn(), from: vi.fn() } }))

const manager = 'f28af85b-5712-4a80-98c2-73b6fbd8d230'
const employee = '693e635c-d43b-4d75-91b2-77a210b32f6e'
const payload = {
  employeeId: employee,
  date: '2026-10-20',
  expectedUpdatedAt: null,
  clockIn: '2026-10-20T20:00:00.000Z',
  clockOut: '2026-10-21T04:00:00.000Z',
  reason: 'Oubli de pointage',
}

function request(body: object) {
  return new NextRequest('http://localhost/api/presences/correction', { method: 'POST', body: JSON.stringify(body) })
}

function authenticate(role: string, email = 'manager@example.com') {
  vi.mocked(requireAuth).mockResolvedValue({
    user: { id: manager, email },
    profile: { id: manager, role, establishment_id: 'site', active_establishment_id: null },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  authenticate('manager')
})

describe('corrections de pointage', () => {
  it.each(['employee', 'supervisor'])('refuse la correction et la lecture à un compte %s', async role => {
    authenticate(role)
    expect((await POST(request(payload))).status).toBe(403)
    expect((await GET(new NextRequest('http://localhost/api/presences/correction'))).status).toBe(403)
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled()
  })

  it('refuse un motif vide et les écritures de la démo', async () => {
    expect((await POST(request({ ...payload, reason: '  ' }))).status).toBe(400)
    authenticate('manager', 'demo@quartzbase.fr')
    expect((await POST(request(payload))).status).toBe(403)
    expect(supabaseAdmin.rpc).not.toHaveBeenCalled()
  })

  it('transmet le service de nuit et prend l’auteur dans la session', async () => {
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: {}, error: null } as never)
    const result = await POST(request({ ...payload, actor: employee }))
    expect(result.status).toBe(200)
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('correct_presence', {
      p_actor: manager, p_employee: employee, p_date: payload.date, p_expected_updated_at: null,
      p_clock_in: payload.clockIn, p_clock_out: payload.clockOut, p_reason: payload.reason,
    })
  })

  it('refuse de lire l’historique d’un autre établissement', async () => {
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: null, error: { code: '42501' } } as never)
    const response = await GET(new NextRequest(`http://localhost/api/presences/correction?employeeId=${employee}&date=${payload.date}`))
    expect(response.status).toBe(403)
    expect(supabaseAdmin.from).not.toHaveBeenCalled()
  })

  it('renvoie un conflit lorsque le formulaire utilise une version périmée', async () => {
    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ data: null, error: { code: 'PT409' } } as never)
    const response = await POST(request({ ...payload, expectedUpdatedAt: '2026-10-21T04:00:00.000Z' }))
    expect(response.status).toBe(409)
  })
})
