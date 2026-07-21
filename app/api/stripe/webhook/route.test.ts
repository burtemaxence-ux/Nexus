import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getStripe, resolvePlan } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { markFirstMonthGranted, churnReferral, applyReferralDiscount } from '@/lib/referral'
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
const updateEqMock = vi.fn().mockResolvedValue({})
const updateMock = vi.fn(() => ({ eq: updateEqMock }))
const deleteEqMock = vi.fn().mockResolvedValue({})
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
  updateEqMock.mockResolvedValue({})
  deleteEqMock.mockResolvedValue({})
  vi.mocked(supabaseAdmin.from as never as () => unknown).mockReturnValue({
    insert: insertMock, upsert: upsertMock, update: updateMock, delete: () => ({ eq: deleteEqMock }),
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

  it('accorde le 1er mois filleul et recalcule la remise parrain au checkout', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_1', type: 'checkout.session.completed',
      data: { object: { mode: 'subscription', metadata: { establishment_id: 'e1', user_id: 'u1' }, customer: 'cus_1', subscription: 'sub_1' } },
    })
    retrieve.mockResolvedValue({
      status: 'active', cancel_at_period_end: false, trial_end: null,
      items: { data: [{ current_period_end: 1893456000, price: { id: 'price_ess_m' } }] },
    })
    vi.mocked(resolvePlan).mockReturnValue('essential')

    const res = await POST(req('sig'))
    expect(res.status).toBe(200)
    expect(vi.mocked(markFirstMonthGranted)).toHaveBeenCalledWith('u1')
    expect(vi.mocked(applyReferralDiscount)).toHaveBeenCalledWith('u1')
  })

  it('ignore une redelivery du même event (idempotence — pas de double cadeau)', async () => {
    insertMock.mockResolvedValue({ error: { code: '23505' } })
    constructEvent.mockReturnValue({
      id: 'evt_dup', type: 'checkout.session.completed',
      data: { object: { mode: 'subscription', metadata: { establishment_id: 'e1', user_id: 'u1' }, customer: 'cus_1', subscription: 'sub_1' } },
    })

    const res = await POST(req('sig'))
    expect(res.status).toBe(200)
    expect((await res.json()).duplicate).toBe(true)
    expect(upsertMock).not.toHaveBeenCalled()
    expect(vi.mocked(markFirstMonthGranted)).not.toHaveBeenCalled()
    expect(vi.mocked(applyReferralDiscount)).not.toHaveBeenCalled()
  })

  it('passe le plan à free, efface l\'ID Stripe et churn le filleul sur subscription.deleted', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_del', type: 'customer.subscription.deleted',
      data: { object: {
        id: 'sub_1', customer: 'cus_1', status: 'canceled', cancel_at_period_end: false, trial_end: null,
        metadata: { establishment_id: 'e1', user_id: 'u_filleul' },
        items: { data: [{ current_period_end: 1893456000, price: { id: 'price_ess_m' } }] },
      } },
    })

    const res = await POST(req('sig'))
    expect(res.status).toBe(200)
    expect(upsertMock).toHaveBeenCalledTimes(1)
    expect(upsertMock.mock.calls[0][0]).toMatchObject({
      establishment_id: 'e1', plan: 'free', stripe_subscription_id: null, status: 'canceled',
    })
    expect(vi.mocked(churnReferral)).toHaveBeenCalledWith('u_filleul')
  })

  it('marque l\'abonnement past_due sur invoice.payment_failed', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_inv', type: 'invoice.payment_failed',
      data: { object: { customer: 'cus_9' } },
    })

    const res = await POST(req('sig'))
    expect(res.status).toBe(200)
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'past_due' }))
    expect(updateEqMock).toHaveBeenCalledWith('stripe_customer_id', 'cus_9')
  })

  it('retire le verrou d\'idempotence et renvoie 500 si le traitement échoue (redelivery possible)', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_ko', type: 'checkout.session.completed',
      data: { object: { mode: 'subscription', metadata: { establishment_id: 'e1', user_id: 'u1' }, customer: 'cus_1', subscription: 'sub_1' } },
    })
    retrieve.mockRejectedValue(new Error('stripe down'))

    const res = await POST(req('sig'))
    expect(res.status).toBe(500)
    expect(deleteEqMock).toHaveBeenCalledWith('event_id', 'evt_ko')
  })
})
