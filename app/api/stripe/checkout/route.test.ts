import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { requireManager } from '@/lib/api-auth'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { TRIAL_DAYS } from '@/lib/subscription'
import { getPendingFirstMonth, firstMonthCouponId } from '@/lib/referral'
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

const sessionsCreate = vi.fn()
const customersCreate = vi.fn()

function fakeSupabase(sub: { stripe_customer_id: string | null; stripe_subscription_id: string | null } | null = null) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'u1', created_at: new Date().toISOString() } } }) },
    from: () => ({ select: () => ({ eq: () => ({
      maybeSingle: async () => ({ data: sub }),
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
  vi.mocked(firstMonthCouponId).mockResolvedValue('qz-referral-firstmonth' as never)
  customersCreate.mockResolvedValue({ id: 'cus_1' })
  sessionsCreate.mockResolvedValue({ url: 'https://checkout.example' })
  vi.mocked(getStripe).mockReturnValue({
    customers: { create: customersCreate },
    checkout: { sessions: { create: sessionsCreate } },
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

  it('1er abonnement classique : essai restant + codes promo, pas de coupon filleul', async () => {
    const res = await POST(req({ planId: 'essential', interval: 'monthly' }))
    expect(res.status).toBe(200)

    const args = sessionsCreate.mock.calls[0][0]
    // Compte créé à l'instant → essai restant = fenêtre complète (TRIAL_DAYS).
    expect(args.subscription_data.trial_period_days).toBe(TRIAL_DAYS)
    expect(args.allow_promotion_codes).toBe(true)
    expect(args.discounts).toBeUndefined()
    expect(args.metadata).toMatchObject({ establishment_id: 'e1', user_id: 'u1' })
  })

  it('filleul : coupon 1er mois SANS essai cumulé (garantie « 1 mois exact », pas ~60 j)', async () => {
    vi.mocked(getPendingFirstMonth).mockResolvedValue({ id: 'ref_1' } as never)

    const res = await POST(req({ planId: 'pro', interval: 'yearly' }))
    expect(res.status).toBe(200)

    const args = sessionsCreate.mock.calls[0][0]
    expect(args.discounts).toEqual([{ coupon: 'qz-referral-firstmonth' }])
    // Le coupon remplace l'essai — les deux cumulés donneraient ~60 j gratuits.
    expect(args.subscription_data.trial_period_days).toBeUndefined()
    // Stripe interdit discounts + allow_promotion_codes ensemble.
    expect(args.allow_promotion_codes).toBeUndefined()
    expect(args.line_items).toEqual([{ price: 'price_pro_y', quantity: 1 }])
  })

  it('ré-abonnement : ni essai, ni coupon, client Stripe réutilisé', async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase({ stripe_customer_id: 'cus_exist', stripe_subscription_id: 'sub_old' }) as never
    )

    const res = await POST(req({ planId: 'essential', interval: 'monthly' }))
    expect(res.status).toBe(200)

    const args = sessionsCreate.mock.calls[0][0]
    expect(args.customer).toBe('cus_exist')
    expect(customersCreate).not.toHaveBeenCalled()
    expect(vi.mocked(getPendingFirstMonth)).not.toHaveBeenCalled()
    expect(args.subscription_data.trial_period_days).toBeUndefined()
    expect(args.discounts).toBeUndefined()
  })
})
