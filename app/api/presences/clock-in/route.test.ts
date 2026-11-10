import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clockIdentity } from '@/lib/presences/clock'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { POST } from './route'

vi.mock('@/lib/presences/clock', () => ({ clockIdentity: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: vi.fn() } }))
vi.mock('@/lib/notifications/create', () => ({ createNotification: vi.fn() }))

const insert = vi.fn()
let openRow: { id: string } | null
let insertError: { code: string } | null

function query(table: string) {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'is', 'not', 'order', 'limit', 'lte', 'gte', 'in']) {
    chain[method] = vi.fn(() => chain)
  }
  chain.maybeSingle = vi.fn(async () => ({ data: table === 'presences' ? openRow : null, error: null }))
  chain.single = vi.fn(async () => ({ data: { id: 'p1' }, error: insertError }))
  chain.insert = insert.mockImplementation(() => chain)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  openRow = null
  insertError = null
  vi.mocked(clockIdentity).mockResolvedValue({ userId: 'u1', establishmentId: 'e1' })
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true } as never)
  vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => query(table)) as never)
})

describe('POST /api/presences/clock-in', () => {
  it('ignore une heure forgée et utilise l’heure serveur', async () => {
    const before = Date.now()
    const res = await POST()
    const after = Date.now()

    expect(res.status).toBe(200)
    const row = insert.mock.calls[0][0]
    expect(row).toMatchObject({ employee_id: 'u1', establishment_id: 'e1' })
    expect(new Date(row.clock_in).getTime()).toBeGreaterThanOrEqual(before)
    expect(new Date(row.clock_in).getTime()).toBeLessThanOrEqual(after)
    expect(row).not.toHaveProperty('time')
  })

  it('refuse un second pointage si un service reste ouvert', async () => {
    openRow = { id: 'p0' }
    expect((await POST()).status).toBe(409)
    expect(insert).not.toHaveBeenCalled()
  })

  it('refuse un pointage déjà enregistré pour le même jour', async () => {
    insertError = { code: '23505' }
    expect((await POST()).status).toBe(409)
  })
})
