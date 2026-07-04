import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getStripe, resolvePlan } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { POST } from './route'

vi.mock('@/lib/stripe', () => ({ getStripe: vi.fn(), resolvePlan: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: vi.fn() } }))
vi.mock('@/lib/referral', () => ({
  markFirstMonthGranted: vi.fn().mockResolvedValue(undefined),
  churnReferral: vi.fn().mockResolvedValue(undefined),
  applyReferralDiscount: vi.fn().mockResolvedValue(undefined),
}))

const insertMock = vi.fn().mockResolvedValue({ error: null })
const upsertMock = vi.fn().mockResolvedValue({ error: null })
const constructEvent = vi.fn()
const retrieve = vi.fn()

function req(signature: string | null, body = 'raw') {
  const headers = new Headers()
  if (signature) headers.set('stripe-signature', signature)
  return { text: async () => body, headers } as unknown as Request as never
}

beforeEach(() => {
  vi.clearAllMocks()
  insertMock.mockResolvedValue({ error: null })
  upsertMock.mockResolvedValue({ error: null })
  vi.mocked(supabaseAdmin.from as never as () => unknown).mockReturnValue({
    insert: insertMock, upsert: upsertMock, delete: () => ({ eq: async () => ({}) }),
  })
  vi.mocked(getStripe).mockReturnValue({
    webhooks: { constructEvent },
    subscriptions: { retrieve },
  } as never)
})

describe('POST /api/stripe/webhook', () => {
  it('renvoie 400 sans signature Stripe', async () => {
    const res = await POST(req(null))
    expect(res.status).toBe(400)
  })

  it('renvoie 400 si la signature est invalide', async () => {
    constructEvent.mockImplementation(() => { throw new Error('bad sig') })
    const res = await POST(req('sig'))
    expect(res.status).toBe(400)
  })

  it('ignore proprement un événement non pertinent', async () => {
    constructEvent.mockReturnValue({ id: 'evt', type: 'customer.created', data: { object: {} } })
    const res = await POST(req('sig'))
    expect(res.status).toBe(200)
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('synchronise l\'abonnement sur checkout.session.completed', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_1', type: 'checkout.session.completed',
      data: { object: { mode: 'subscription', metadata: { establishment_id: 'e1', user_id: 'u1' }, customer: 'cus_1', subscription: 'sub_1' } },
    })
    retrieve.mockResolvedValue({
      status: 'active', cancel_at_period_end: false, trial_end: null,
      items: { data: [{ current_period_end: 1893456000, price: { id: 'price_multi_m' } }] },
    })
    vi.mocked(resolvePlan).mockReturnValue('multisite')

    const res = await POST(req('sig'))
    expect(res.status).toBe(200)
    expect(upsertMock).toHaveBeenCalledTimes(1)
    expect(upsertMock.mock.calls[0][0]).toMatchObject({
      establishment_id: 'e1', plan: 'multisite', status: 'active', stripe_subscription_id: 'sub_1',
    })
  })
})
