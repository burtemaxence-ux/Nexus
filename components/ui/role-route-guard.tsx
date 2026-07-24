'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Si la session Supabase change dans un autre onglet (ex. lien d'invitation
// ouvert dans le même navigateur → les cookies deviennent ceux de l'employé),
// la soft navigation ne re-rend pas le layout (dashboard) : la sidebar
// garderait l'ancien rôle (manager) autour d'une page employé. Le middleware
// redirige déjà la *page* vers le bon espace ; on force ici un rechargement
// complet pour resynchroniser tout l'écran avec la session réelle.
//
// On ne réagit qu'au sens « shell manager/superviseur sur une route
// /employee ». C'est le seul cas non ambigu : le middleware sort toujours un
// vrai manager/superviseur des routes /employee, donc voir ce shell là ne peut
// être qu'un layout périmé. Le sens inverse (shell employé sur /manager) est
// volontairement ignoré : c'est l'état transitoire normal d'un nouveau manager
// Google (profiles.role='employee' jusqu'à ce que /api/auth/set-role le
// promeuve), qu'un reload ici mettrait en boucle.
export function RoleRouteGuard({ role }: { role: 'manager' | 'employee' | 'supervisor' }) {
  const pathname = usePathname()

  useEffect(() => {
    const staleManagerShell =
      (role === 'manager' || role === 'supervisor') && pathname.startsWith('/employee')
    if (staleManagerShell) window.location.reload()
  }, [pathname, role])

  return null
}
