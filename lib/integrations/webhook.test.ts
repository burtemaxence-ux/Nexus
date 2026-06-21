import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'crypto'
import { signPayload, testWebhook } from './webhook'

describe('signPayload', () => {
  it('produces a GitHub-style sha256 HMAC of the body', () => {
    const body = '{"event":"test"}'
    const expected = 'sha256=' + createHmac('sha256', 'secret').update(body).digest('hex')
    expect(signPayload('secret', body)).toBe(expected)
  })
})

describe('testWebhook delivery', () => {
  beforeEach(() => { vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('signs generic deliveries with X-Quartzbase-Signature when a secret is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const res = await testWebhook('https://example.com/hook', 'generic', 'topsecret')

    expect(res.ok).toBe(true)
    const [, init] = fetchMock.mock.calls[0]
    const sig = init.headers['X-Quartzbase-Signature']
    expect(sig).toBe(signPayload('topsecret', init.body))
  })

  it('does not sign when no secret is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    await testWebhook('https://example.com/hook', 'generic')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers['X-Quartzbase-Signature']).toBeUndefined()
  })

  it('retries on a 5xx then succeeds', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const res = await testWebhook('https://example.com/hook', 'generic')

    expect(res.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry a permanent 4xx failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400 })
    vi.stubGlobal('fetch', fetchMock)

    const res = await testWebhook('https://example.com/hook', 'generic')

    expect(res.ok).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
