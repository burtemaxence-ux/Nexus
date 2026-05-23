import { createClient } from '@/lib/supabase/server'

type PermConfig = {
  custom_roles: string[]
  matrix: Record<string, Record<string, boolean>>
}

/**
 * Returns the permission map for a user, or null if the user is a manager
 * (null = unrestricted — all permissions implicitly granted).
 */
export async function getUserPermissions(
  userId: string
): Promise<Record<string, boolean> | null> {
  const supabase = await createClient()

  const [{ data: profile }, { data: setting }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).single(),
    supabase.from('settings').select('value').eq('key', 'permissions_matrix').single(),
  ])

  if (!profile) return {}

  if (profile.role === 'manager') return null

  if (!setting?.value) return {}

  try {
    const config = JSON.parse(setting.value) as PermConfig
    return config.matrix?.[profile.role] ?? {}
  } catch {
    return {}
  }
}

/**
 * Returns true if the user has the given permission.
 * Manager always returns true. Unknown users return false.
 */
export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const perms = await getUserPermissions(userId)
  if (perms === null) return true
  return perms[permission] === true
}
