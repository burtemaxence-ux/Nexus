import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notifyOps } from '@/lib/ops-alert'
import { POST } from './route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: vi.fn() } }))
vi.mock('@/lib/ops-alert', () => ({ notifyOps: vi.fn().mockResolvedValue(undefined) }))

const insertMock = vi.fn().mockResolvedValue({ error: null })

function fakeSupabase(user: { id: string; email?: string } | null) {
  return {
    auth: { getUser: async () => ({ data: { user } }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { full_name: 'Max', role: 'manager', establishment_id: 'e1', active_establishment_id: 'e1' } }) }) }),
    }),
  }
}

function req(body: unknown) {
  return { json: async () => body } as unknown as Request as never
}

beforeEach(() => {
  vi.clearAllMocks()
  insertMock.mockResolvedValue({ error: null })
  vi.mocked(supabaseAdmin.from as never as () => unknown).mockReturnValue({ insert: insertMock })
})

describe('POST /api/feedback', () => {
  it('renvoie 401 si non authentifié', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase(null) as never)
    const res = await POST(req({ message: 'Un souci sur le planning' }))
    expect(res.status).toBe(401)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('renvoie 400 si le message est trop court', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase({ id: 'u1', email: 'a@b.fr' }) as never)
    const res = await POST(req({ message: 'x' }))
    expect(res.status).toBe(400)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('enregistre le signalement et alerte l\'opérateur quand tout est valide', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase({ id: 'u1', email: 'a@b.fr' }) as never)
    const res = await POST(req({ message: 'Impossible de publier le planning', url: 'https://x/manager/planning' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(vi.mocked(notifyOps)).toHaveBeenCalledTimes(1)
  })

  it('persiste motif + sujet et les inclut dans l\'alerte opérateur', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase({ id: 'u1', email: 'a@b.fr' }) as never)
    const res = await POST(req({
      message: 'Le bouton publier ne répond pas',
      category: 'Problème technique',
      subject: 'Publication planning',
      url: 'https://x/manager/planning',
    }))
    expect(res.status).toBe(200)
    expect(insertMock).toHaveBeenCalledTimes(1)
    const payload = insertMock.mock.calls[0][0] as { category: string; subject: string }
    expect(payload.category).toBe('Problème technique')
    expect(payload.subject).toBe('Publication planning')
    const opsArg = vi.mocked(notifyOps).mock.calls[0][0] as { subject: string; body: string }
    expect(opsArg.subject).toContain('Publication planning')
    expect(opsArg.body).toContain('Motif : Problème technique')
  })

  it('reste rétro-compatible : message seul (motif/sujet NULL)', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase({ id: 'u1', email: 'a@b.fr' }) as never)
    const res = await POST(req({ message: 'Signalement simple sans motif' }))
    expect(res.status).toBe(200)
    const payload = insertMock.mock.calls[0][0] as { category: string | null; subject: string | null }
    expect(payload.category).toBeNull()
    expect(payload.subject).toBeNull()
  })

  it('renvoie 500 si l\'insertion échoue (et n\'alerte pas)', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeSupabase({ id: 'u1', email: 'a@b.fr' }) as never)
    insertMock.mockResolvedValue({ error: { message: 'db down' } })
    const res = await POST(req({ message: 'Impossible de publier le planning' }))
    expect(res.status).toBe(500)
    expect(vi.mocked(notifyOps)).not.toHaveBeenCalled()
  })
})
