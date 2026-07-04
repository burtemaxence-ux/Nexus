import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { isOperator } from '@/lib/operator'

// Pages publiques marketing (groupe app/(public)) accessibles sans connexion.
const PUBLIC_MARKETING_PAGES = [
  '/securite',
  '/conformite',
  '/guide-demarrage',
  '/code-du-travail',
  '/a-propos',
  '/devenir-partenaire',
]

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
  if (!user && pathname !== '/' && pathname !== '/login' && pathname !== '/register'
    && pathname !== '/billing'
    && !PUBLIC_MARKETING_PAGES.includes(pathname)
    && !pathname.startsWith('/auth/')
    && !pathname.startsWith('/legal/')
    && !pathname.startsWith('/api/stripe/')
    && !pathname.startsWith('/api/cron/')
    && !pathname.startsWith('/api/calendar/')
    && !pathname.startsWith('/api/v1/')
    && pathname !== '/api/health'
    && pathname !== '/api/push/vapid-key'
    && pathname !== '/api/csp-report') {
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

    // Back-office opérateur : réservé aux emails listés dans OPERATOR_EMAILS
    if (pathname.startsWith('/admin')) {
      if (!isOperator(user.email)) {
        const url = request.nextUrl.clone()
        url.pathname = role === 'employee' ? '/employee' : '/manager'
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    // Redirect depuis /login vers le dashboard approprié
    if (pathname === '/login' || pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'manager' ? '/manager' : '/employee'
      return NextResponse.redirect(url)
    }

    // Protection des routes manager (managers et superviseurs autorisés)
    // Un rôle indéfini (ex: nouveau compte Google) peut accéder à /manager — l'onboarding prend le relais
    if (pathname.startsWith('/manager') && role && role !== 'manager' && role !== 'supervisor') {
      const url = request.nextUrl.clone()
      url.pathname = '/employee'
      return NextResponse.redirect(url)
    }

    // Protection des routes employee (employés seulement)
    // Un rôle indéfini peut accéder à /manager (onboarding) — pas à /employee
    if (pathname.startsWith('/employee') && role && role !== 'employee') {
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
