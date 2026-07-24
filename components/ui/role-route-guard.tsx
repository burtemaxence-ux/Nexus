'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Si la session Supabase change dans un autre onglet (ex. lien d'invitation
// ouvert dans le même navigateur → les cookies deviennent ceux de l'employé),
// la soft navigation ne re-rend pas le layout (dashboard) : la sidebar
// garderait l'ancien rôle autour d'une page de l'autre espace. Le middleware
// redirige déjà la *page* vers le bon espace ; on détecte ici l'incohérence
// rôle du shell ↔ route affichée et on force un rechargement complet pour
// resynchroniser tout l'écran avec la session réelle.
export function RoleRouteGuard({ role }: { role: 'manager' | 'employee' | 'supervisor' }) {
  const pathname = usePathname()

  useEffect(() => {
    const mismatch = role === 'employee'
      ? pathname.startsWith('/manager')
      : pathname.startsWith('/employee')
    if (mismatch) window.location.reload()
  }, [pathname, role])

  return null
}
