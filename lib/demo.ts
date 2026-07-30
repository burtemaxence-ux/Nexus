// Démo publique — comptes et établissement de démonstration.
//
// Principe : la démo N'EST PAS une application parallèle. C'est l'application
// réelle, connectée à des comptes de démonstration peuplés. Toute divergence
// entre ce que voit un visiteur et ce que voit un vrai client est donc
// impossible par construction.

export const DEMO_ESTABLISHMENT_NAME = 'La Boulangerie du Soleil'

export const DEMO_ACCOUNTS = {
  manager: 'demo@quartzbase.fr',
  employee: 'alice.martin@demo.qb.fr',
} as const

export type DemoRole = keyof typeof DEMO_ACCOUNTS

export function isDemoRole(value: string | null | undefined): value is DemoRole {
  return value === 'manager' || value === 'employee'
}

/** Un compte de démonstration ? Sert à afficher le bandeau et à borner le reset. */
export function isDemoAccount(email: string | null | undefined): boolean {
  if (!email) return false
  return (Object.values(DEMO_ACCOUNTS) as readonly string[]).includes(email)
}

/** Destination après ouverture de session. */
export const DEMO_LANDING: Record<DemoRole, string> = {
  manager: '/manager',
  employee: '/employee',
}
