import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSubscription } from '@/lib/subscription'
import { POST } from './route'

// Depuis la correction B1, le trigger handle_new_user ignore les métadonnées du
// client : tout compte créé arrive `employee` dans un établissement transitoire
// qui lui appartient. Cette route est donc le SEUL chemin vers un établissement
// existant — ces tests verrouillent ce contrat.

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: vi.fn(), auth: { admin: { generateLink: vi.fn(), deleteUser: vi.fn() } } },
}))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  getClientIp: () => '127.0.0.1',
  rateLimitResponse: () => new Response(null, { status: 429 }),
}))
vi.mock('@/lib/subscription', () => ({ getSubscription: vi.fn() }))
vi.mock('@/lib/plan-guard', () => ({
  getPlanTier: () => 'pro',
  PLAN_EMPLOYEE_LIMITS: { pro: Infinity },
}))
vi.mock('@/lib/notifications/create', () => ({ createNotification: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/sms', () => ({ sendSms: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/api-auth', () => ({
  requireAuth: async () => ({
    user: { id: 'mgr-1' },
    profile: { role: 'manager', establishment_id: 'ETAB-MANAGER' },
  }),
}))

const TRANSIENT = 'ETAB-TRANSITOIRE'

let profileUpdate: ReturnType<typeof vi.fn>
let establishmentDelete: ReturnType<typeof vi.fn>
let updateError: { message: string } | null

function wireAdmin() {
  profileUpdate = vi.fn().mockImplementation(() => ({ eq: async () => ({ error: updateError }) }))
  establishmentDelete = vi.fn().mockImplementation(() => ({ eq: async () => ({ error: null }) }))

  vi.mocked(supabaseAdmin.from as never as (t: string) => unknown).mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        update: profileUpdate,
        select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'emp-1', establishment_id: TRANSIENT } }) }) }),
      }
    }
    if (table === 'establishments') return { delete: establishmentDelete }
    if (table === 'contracts') return { insert: async () => ({ error: null }) }
    return {}
  })
}

function req(body: unknown) {
  return {
    json: async () => body,
    headers: new Headers({ host: 'quartzbase.fr' }),
  } as unknown as Parameters<typeof POST>[0]
}

const validInvite = {
  first_name: 'Marie',
  last_name: 'Durand',
  email: 'marie@resto.fr',
  role: 'supervisor' as const,
  position: 'Cheffe de rang',
}

beforeEach(() => {
  vi.clearAllMocks()
  updateError = null
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, resetAt: 0 } as never)
  vi.mocked(getSubscription).mockResolvedValue({ plan: 'pro', status: 'active' } as never)
  vi.mocked(supabaseAdmin.auth.admin.generateLink).mockResolvedValue({
    data: { properties: { action_link: 'https://quartzbase.fr/invite' }, user: { id: 'emp-1' } },
    error: null,
  } as never)
  wireAdmin()
})

describe('POST /api/employees/invite', () => {
  it("rattache l'invité à l'établissement du manager, jamais à l'établissement transitoire", async () => {
    const res = await POST(req(validInvite))
    expect(res.status).toBe(200)

    const payload = profileUpdate.mock.calls[0][0]
    expect(payload.establishment_id).toBe('ETAB-MANAGER')
    expect(payload.establishment_id).not.toBe(TRANSIENT)
  })

  it('porte le rôle demandé — le trigger ne le fait plus', async () => {
    await POST(req(validInvite))
    // Sans ça, tout superviseur ou co-manager invité resterait 'employee'.
    expect(profileUpdate.mock.calls[0][0].role).toBe('supervisor')
  })

  it("supprime l'établissement transitoire créé par le trigger", async () => {
    await POST(req(validInvite))
    expect(establishmentDelete).toHaveBeenCalled()
  })

  it("ne supprime rien si l'invité est déjà dans l'établissement du manager", async () => {
    vi.mocked(supabaseAdmin.from as never as (t: string) => unknown).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          update: profileUpdate,
          select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'emp-1', establishment_id: 'ETAB-MANAGER' } }) }) }),
        }
      }
      if (table === 'establishments') return { delete: establishmentDelete }
      return {}
    })
    await POST(req(validInvite))
    expect(establishmentDelete).not.toHaveBeenCalled()
  })

  it("échoue bruyamment si l'enrichissement échoue, au lieu de laisser l'invité isolé", async () => {
    // Régression historique : la colonne invited_by manquait en production,
    // l'UPDATE échouait EN ENTIER et personne ne le voyait.
    updateError = { message: `column "invited_by" of relation "profiles" does not exist` }

    const res = await POST(req(validInvite))
    expect(res.status).toBe(500)
    expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('emp-1')
    expect(establishmentDelete).not.toHaveBeenCalled()
  })
})
