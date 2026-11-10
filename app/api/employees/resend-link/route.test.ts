import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const mocks = vi.hoisted(() => ({
  findEmployee: vi.fn(),
  eq: vi.fn().mockReturnThis(),
  getUserById: vi.fn(),
  generateLink: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: async () => ({ allowed: true }),
  getClientIp: () => 'localhost',
  rateLimitResponse: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'manager', email: 'manager@example.com' } } }) },
    from: () => ({
      select() { return this },
      eq: mocks.eq,
      single: async () => ({
        data: { role: 'manager', establishment_id: 'home', active_establishment_id: 'site' },
      }),
      maybeSingle: mocks.findEmployee,
    }),
  }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { auth: { admin: { getUserById: mocks.getUserById, generateLink: mocks.generateLink } } },
}))

function request(email: string) {
  return new NextRequest('http://localhost/api/employees/resend-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

describe('renvoi du lien d’accès salarié', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findEmployee.mockResolvedValue({ data: { id: 'employee' }, error: null })
    mocks.getUserById.mockResolvedValue({ data: { user: { email: 'employee@example.com' } }, error: null })
    mocks.generateLink.mockResolvedValue({
      data: { user: { id: 'employee' }, properties: { action_link: 'https://example.com/link' } },
      error: null,
    })
  })

  it('vérifie le salarié de l’établissement actif avant de créer le lien', async () => {
    expect((await POST(request('employee@example.com'))).status).toBe(200)
    expect(mocks.eq).toHaveBeenCalledWith('establishment_id', 'site')
    expect(mocks.eq).toHaveBeenCalledWith('role', 'employee')
    expect(mocks.getUserById).toHaveBeenCalledWith('employee')
    expect(mocks.generateLink).toHaveBeenCalledWith(expect.objectContaining({ email: 'employee@example.com' }))
  })

  it('ne génère aucun lien pour un salarié extérieur', async () => {
    mocks.findEmployee.mockResolvedValue({ data: null, error: null })
    expect((await POST(request('external@example.com'))).status).toBe(404)
    expect(mocks.getUserById).not.toHaveBeenCalled()
    expect(mocks.generateLink).not.toHaveBeenCalled()
  })

  it('refuse une adresse de profil différente de l’adresse du compte Auth', async () => {
    expect((await POST(request('external@example.com'))).status).toBe(404)
    expect(mocks.generateLink).not.toHaveBeenCalled()
  })

  it('ne renvoie pas un lien associé à un autre compte Auth', async () => {
    mocks.generateLink.mockResolvedValue({
      data: { user: { id: 'other' }, properties: { action_link: 'https://example.com/link' } },
      error: null,
    })
    expect((await POST(request('employee@example.com'))).status).toBe(500)
  })
})
