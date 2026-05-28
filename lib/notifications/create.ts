import { supabaseAdmin } from '@/lib/supabase/admin'

export interface CreateNotificationParams {
  user_ids: string[]
  establishment_id?: string | null
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
  action_url?: string | null
}

/**
 * Insert in-app notifications for one or more users.
 * Uses supabaseAdmin to bypass RLS — call only from server-side Route Handlers or crons.
 * Fire-and-forget: errors are logged but never thrown to avoid breaking the calling flow.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const { user_ids, establishment_id, type, title, body, data, action_url } = params
  if (!user_ids.length) return

  const rows = user_ids.map(uid => ({
    user_id: uid,
    establishment_id: establishment_id ?? null,
    type,
    title,
    body,
    data: data ?? {},
    action_url: action_url ?? null,
  }))

  const { error } = await supabaseAdmin.from('notifications').insert(rows)
  if (error) console.error('[createNotification]', type, error.message)
}
