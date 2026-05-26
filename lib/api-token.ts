import { createHash, randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex')
  const hash = createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

export async function validateApiToken(authHeader: string | null): Promise<{ establishmentId: string; tokenId: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const raw = authHeader.slice(7).trim()
  if (!raw) return null

  const hash = createHash('sha256').update(raw).digest('hex')

  const { data } = await supabaseAdmin
    .from('api_tokens')
    .select('id, establishment_id')
    .eq('token_hash', hash)
    .single()

  if (!data) return null

  void supabaseAdmin
    .from('api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return { establishmentId: data.establishment_id, tokenId: data.id }
}
