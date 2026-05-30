import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification } from './create'
import { sendPushToUser } from '@/lib/push'

interface NotifyUserParams {
  userId: string
  establishmentId?: string | null
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
  actionUrl?: string | null
  pushEnabled?: boolean
  pushTitle?: string
  pushBody?: string
  pushUrl?: string
}

interface NotifyManagersParams {
  managerIds: string[]
  establishmentId: string
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
  actionUrl?: string | null
  pushEnabled?: boolean
  pushTitle?: string
  pushBody?: string
  pushUrl?: string
}

/**
 * Creates an in-app notification and optionally sends a push for a single user.
 */
export async function notifyUser({
  userId,
  establishmentId,
  type,
  title,
  body,
  data,
  actionUrl,
  pushEnabled = true,
  pushTitle,
  pushBody,
  pushUrl,
}: NotifyUserParams): Promise<void> {
  await createNotification({
    user_ids: [userId],
    establishment_id: establishmentId,
    type,
    title,
    body,
    data,
    action_url: actionUrl,
  })

  if (pushEnabled) {
    sendPushToUser(supabaseAdmin, userId, {
      title: pushTitle ?? title,
      body: pushBody ?? body,
      url: pushUrl ?? actionUrl ?? undefined,
    }).catch(e => console.error('[notifyUser] push failed:', e))
  }
}

/**
 * Creates a grouped in-app notification and sends individual push notifications
 * to a list of managers. Callers are responsible for providing the correct managerIds.
 */
export async function notifyManagers({
  managerIds,
  establishmentId,
  type,
  title,
  body,
  data,
  actionUrl,
  pushEnabled = true,
  pushTitle,
  pushBody,
  pushUrl,
}: NotifyManagersParams): Promise<void> {
  if (!managerIds.length) return

  await createNotification({
    user_ids: managerIds,
    establishment_id: establishmentId,
    type,
    title,
    body,
    data,
    action_url: actionUrl,
  })

  if (pushEnabled) {
    managerIds.forEach(id => {
      sendPushToUser(supabaseAdmin, id, {
        title: pushTitle ?? title,
        body: pushBody ?? body,
        url: pushUrl ?? actionUrl ?? undefined,
      }).catch(() => {})
    })
  }
}
