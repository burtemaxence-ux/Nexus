import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { getPendingFirstMonth } from '@/lib/referral'
import { POST } from './route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/api-auth', () => ({ requireManager: vi.fn() }))
vi.mock('@/lib/referral', () => ({ getPendingFirstMonth: vi.fn(), firstMonthCouponId: vi.fn() }))
vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(),
  STRIPE_PRICES: {
    essential_monthly: 'price_ess_m', essential_yearly: 'price_ess_y',
    pro_monthly: 'price_pro_m', pro_yearly: 'price_pro_y',
    multisite_monthly: 'price_multi_m', multisite_yearly: 'price_multi_y',
  },
}))

function fakeSupabase() {
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'u1', created_at: new Date().toISOString() } } }) },
    from: () => ({ select: () => ({ eq: () => ({
      maybeSingle: async () => ({ data: null }),
      single: async () => ({ data: { full_name: 'Max' } }),
    }) }) }),
  }
}
function req(body: unknown) { return { json: async () => body } as unknown as Request as never }

beforeEach(() => {
  vi.clearAllMocks()
  STRIPE_PRICES.essential_monthly = 'price_ess_m'
  vi.mocked(requireManager).mockResolvedValue({
    user: { id: 'u1', email: 'm@x.fr' },
    profile: { id: 'u1', role: 'manager', establishment_id: 'e1', active_establishment_id: 'e1' },
  })
  vi.mocked(createClient).mockResolvedValue(fakeSupabase() as never)
  vi.mocked(getPendingFirstMonth).mockResolvedValue(null as never)
  vi.mocked(getStripe).mockReturnValue({
    customers: { create: vi.fn().mockResolvedValue({ id: 'cus_1' }) },
    checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://checkout.example' }) } },
  } as never)
})

describe('POST /api/stripe/checkout', () => {
  it('renvoie 400 pour un plan invalide', async () => {
    const res = await POST(req({ planId: 'entreprise', interval: 'monthly' }))
    expect(res.status).toBe(400)
  })

  it('renvoie 503 quand le prix du plan n\'est pas configuré', async () => {
    STRIPE_PRICES.essential_monthly = ''
    const res = await POST(req({ planId: 'essential', interval: 'monthly' }))
    expect(res.status).toBe(503)
  })

  it('crée une session de paiement et renvoie son URL', async () => {
    const res = await POST(req({ planId: 'multisite', interval: 'monthly' }))
    expect(res.status).toBe(200)
    expect((await res.json()).url).toBe('https://checkout.example')
  })
})
