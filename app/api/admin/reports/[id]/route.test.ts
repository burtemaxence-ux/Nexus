import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isOperator } from '@/lib/operator'
import { PATCH } from './route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/operator', () => ({ isOperator: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: vi.fn() } }))

const eqMock = vi.fn().mockResolvedValue({ error: null })
const updateMock = vi.fn(() => ({ eq: eqMock }))

function fakeSupabase(user: { id: string; email?: string } | null) {
  return { auth: { getUser: async () => ({ data: { user } }) } }
}
function req(body: unknown) {
  return { json: async () => body } as unknown as Request as never
}
const params = { params: Promise.resolve({ id: 'r1' }) }

beforeEach(() => {
  vi.clearAllMocks()
  eqMock.mockResolvedValue({ error: null })
  vi.mocked(supabaseAdmin.from as never as () => unknown).mockReturnValue({ update: updateMock })
})

describe('PATCH /api/admin/reports/[id]', () => {
  it('renvoie 403 si non opérateur', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase({ id: 'u1', email: 'x@x.fr' }) as never)
    vi.mocked(isOperator).mockReturnValue(false)
    const res = await PATCH(req({ status: 'resolved' }), params)
    expect(res.status).toBe(403)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('renvoie 400 pour un statut invalide', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase({ id: 'u1', email: 'op@x.fr' }) as never)
    vi.mocked(isOperator).mockReturnValue(true)
    const res = await PATCH(req({ status: 'n_importe_quoi' }), params)
    expect(res.status).toBe(400)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('met à jour le statut pour un opérateur', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase({ id: 'u1', email: 'op@x.fr' }) as never)
    vi.mocked(isOperator).mockReturnValue(true)
    const res = await PATCH(req({ status: 'resolved' }), params)
    expect(res.status).toBe(200)
    expect(updateMock).toHaveBeenCalledWith({ status: 'resolved' })
    expect(eqMock).toHaveBeenCalledWith('id', 'r1')
  })
})
