import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requireAuth } from '@/lib/api-auth'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { GET, POST } from './route'
import { DELETE } from './[docId]/route'

vi.mock('@/lib/api-auth', () => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { storage: { from: vi.fn() } } }))

const req = new NextRequest('http://localhost/api/employees/employee/documents')
const params = { id: 'employee' }

function authenticate(role: string, id = 'caller') {
  vi.mocked(requireAuth).mockResolvedValue({
    user: { id, email: 'qa@example.com' },
    profile: { id, role, establishment_id: 'home', active_establishment_id: 'site' },
  })
}

function query(data: unknown) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  }
  vi.mocked(createClient).mockResolvedValue({ from: vi.fn().mockReturnValue(builder) } as never)
  return builder
}

beforeEach(() => {
  vi.clearAllMocks()
  authenticate('manager')
})

describe('isolation des documents salariés', () => {
  it('signe uniquement les fichiers du salarié et de l’établissement actif', async () => {
    const builder = query([
      { id: 'local', file_path: 'site/employee/contrat.pdf' },
      { id: 'external', file_path: 'other/employee/contrat.pdf' },
    ])
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed' } })
    vi.mocked(supabaseAdmin.storage.from).mockReturnValue({ createSignedUrl } as never)

    const res = await GET(req, { params })
    expect(res.status).toBe(200)
    expect(builder.eq).toHaveBeenCalledWith('establishment_id', 'site')
    expect(createSignedUrl).toHaveBeenCalledExactlyOnceWith('site/employee/contrat.pdf', 3600)
    expect(await res.json()).toEqual([
      { id: 'local', file_path: 'site/employee/contrat.pdf', url: 'https://example.com/signed' },
    ])
  })

  it('refuse la consultation du dossier d’un autre salarié', async () => {
    authenticate('employee')
    expect((await GET(req, { params })).status).toBe(403)
    expect(supabaseAdmin.storage.from).not.toHaveBeenCalled()
  })

  it('vérifie le salarié avant tout dépôt', async () => {
    const builder = query(null)
    expect((await POST(req, { params })).status).toBe(404)
    expect(builder.eq).toHaveBeenCalledWith('establishment_id', 'site')
    expect(supabaseAdmin.storage.from).not.toHaveBeenCalled()
  })

  it('dépose le fichier dans le dossier de l’établissement actif', async () => {
    const employee = { id: params.id }
    const lookup = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: employee, error: null }),
    }
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'document' }, error: null }),
      }),
    })
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValueOnce(lookup).mockReturnValueOnce({ insert }),
    } as never)
    const upload = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(supabaseAdmin.storage.from).mockReturnValue({ upload } as never)
    const body = new FormData()
    body.set('file', new File(['document fictif'], 'contrat.pdf', { type: 'application/pdf' }))
    const response = await POST(new NextRequest(req.url, { method: 'POST', body }), { params })

    expect(response.status).toBe(201)
    const [path] = upload.mock.calls[0]
    expect(path).toMatch(/^site\/employee\/[a-f0-9-]+\.pdf$/)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      employee_id: employee.id, establishment_id: 'site', file_path: path,
    }))
  })

  it('ne supprime jamais un fichier dont le chemin sort du dossier autorisé', async () => {
    const builder = query({ file_path: 'other/employee/contrat.pdf' })
    expect((await DELETE(req, { params: { ...params, docId: 'document' } })).status).toBe(404)
    expect(builder.eq).toHaveBeenCalledWith('establishment_id', 'site')
    expect(supabaseAdmin.storage.from).not.toHaveBeenCalled()
  })
})
