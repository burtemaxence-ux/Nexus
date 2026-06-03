import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Si un code OAuth arrive sur n'importe quelle page (hors /auth/callback),
  // le router vers /auth/callback pour que le code exchange se fasse correctement
  if (searchParams.get('code') && pathname !== '/auth/callback') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  const { supabaseResponse, user } = await updateSession(request)

  // Si l'utilisateur n'est pas connecté et tente d'accéder à une route protégée
  if (!user && pathname !== '/login' && !pathname.startsWith('/auth/') && pathname !== '/demo' && !pathname.startsWith('/api/demo/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Si l'utilisateur est connecté
  if (user) {
    const role = user.user_metadata?.role as string | undefined

    // Laisser passer la page de création de mot de passe sans redirect
    if (pathname === '/auth/set-password') {
      return supabaseResponse
    }

    // Redirect depuis /login vers le dashboard approprié
    if (pathname === '/login' || pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'manager' ? '/manager' : '/employee'
      return NextResponse.redirect(url)
    }

    // Protection des routes manager (managers et superviseurs autorisés)
    if (pathname.startsWith('/manager') && role !== 'manager' && role !== 'supervisor') {
      const url = request.nextUrl.clone()
      url.pathname = '/employee'
      return NextResponse.redirect(url)
    }

    // Protection des routes employee (employés seulement)
    if (pathname.startsWith('/employee') && role !== 'employee') {
      const url = request.nextUrl.clone()
      url.pathname = '/manager'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico
     * - fichiers avec extensions (png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
