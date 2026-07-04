import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/operator'
import { notifyOps } from '@/lib/ops-alert'
import { POST } from './route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/operator', () => ({ isOperator: vi.fn() }))
vi.mock('@/lib/ops-alert', () => ({ notifyOps: vi.fn().mockResolvedValue(undefined) }))

function fakeSupabase(user: { id: string; email?: string } | null) {
  return { auth: { getUser: async () => ({ data: { user } }) } }
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/admin/test-alert', () => {
  it('renvoie 403 si non authentifié', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase(null) as never)
    const res = await POST()
    expect(res.status).toBe(403)
    expect(vi.mocked(notifyOps)).not.toHaveBeenCalled()
  })

  it('renvoie 403 si l\'utilisateur n\'est pas opérateur', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase({ id: 'u1', email: 'intrus@x.fr' }) as never)
    vi.mocked(isOperator).mockReturnValue(false)
    const res = await POST()
    expect(res.status).toBe(403)
    expect(vi.mocked(notifyOps)).not.toHaveBeenCalled()
  })

  it('envoie une alerte de test pour un opérateur', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase({ id: 'u1', email: 'op@x.fr' }) as never)
    vi.mocked(isOperator).mockReturnValue(true)
    const res = await POST()
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
    expect(vi.mocked(notifyOps)).toHaveBeenCalledTimes(1)
  })
})
