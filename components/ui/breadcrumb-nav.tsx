'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

type Crumb = { label: string; href: string }

// Static route definitions — ordered longest-first so the right match wins
const ROUTES: { pattern: RegExp; crumbs: (m: RegExpMatchArray) => Crumb[] }[] = [
  // Employee sub-sub pages
  { pattern: /^\/manager\/employees\/([^/]+)\/edit$/, crumbs: (m) => [
    { label: 'Équipe',        href: '/manager/employees' },
    { label: 'Fiche employé', href: `/manager/employees/${m[1]}` },
    { label: 'Modifier',      href: `/manager/employees/${m[1]}/edit` },
  ]},
  // Employee detail
  { pattern: /^\/manager\/employees\/new$/, crumbs: () => [
    { label: 'Équipe',        href: '/manager/employees' },
    { label: 'Nouvel employé', href: '/manager/employees/new' },
  ]},
  { pattern: /^\/manager\/employees\/([^/]+)$/, crumbs: (m) => [
    { label: 'Équipe',        href: '/manager/employees' },
    { label: 'Fiche employé', href: `/manager/employees/${m[1]}` },
  ]},
  // Settings sub-pages
  { pattern: /^\/manager\/settings\/organisation$/, crumbs: () => [
    { label: 'Paramètres',    href: '/manager/settings' },
    { label: 'Organisation',  href: '/manager/settings/organisation' },
  ]},
  { pattern: /^\/manager\/settings\/postes$/, crumbs: () => [
    { label: 'Paramètres',    href: '/manager/settings' },
    { label: 'Postes & rôles', href: '/manager/settings/postes' },
  ]},
  { pattern: /^\/manager\/settings\/regles$/, crumbs: () => [
    { label: 'Paramètres',    href: '/manager/settings' },
    { label: 'Planning',      href: '/manager/settings/regles' },
  ]},
  { pattern: /^\/manager\/settings\/contrats$/, crumbs: () => [
    { label: 'Paramètres',    href: '/manager/settings' },
    { label: 'Contrats & RH', href: '/manager/settings/contrats' },
  ]},
  { pattern: /^\/manager\/settings\/conges$/, crumbs: () => [
    { label: 'Paramètres',    href: '/manager/settings' },
    { label: 'Congés',        href: '/manager/settings/conges' },
  ]},
  { pattern: /^\/manager\/settings\/alertes$/, crumbs: () => [
    { label: 'Paramètres',    href: '/manager/settings' },
    { label: 'Notifications', href: '/manager/settings/alertes' },
  ]},
  { pattern: /^\/manager\/settings\/exports$/, crumbs: () => [
    { label: 'Paramètres',    href: '/manager/settings' },
    { label: 'Exports & paie', href: '/manager/settings/exports' },
  ]},
  { pattern: /^\/manager\/settings\/integrations$/, crumbs: () => [
    { label: 'Paramètres',    href: '/manager/settings' },
    { label: 'Intégrations',  href: '/manager/settings/integrations' },
  ]},
  // Top-level manager pages
  { pattern: /^\/manager\/employees$/, crumbs: () => [
    { label: 'Accueil',   href: '/manager' },
    { label: 'Équipe',    href: '/manager/employees' },
  ]},
  { pattern: /^\/manager\/planning(\/.*)?$/, crumbs: () => [
    { label: 'Accueil',   href: '/manager' },
    { label: 'Planning',  href: '/manager/planning' },
  ]},
  { pattern: /^\/manager\/rapport$/, crumbs: () => [
    { label: 'Accueil',   href: '/manager' },
    { label: 'Rapport',   href: '/manager/rapport' },
  ]},
  { pattern: /^\/manager\/presences$/, crumbs: () => [
    { label: 'Accueil',   href: '/manager' },
    { label: 'Badgeuse',  href: '/manager/presences' },
  ]},
  { pattern: /^\/manager\/conges$/, crumbs: () => [
    { label: 'Accueil',   href: '/manager' },
    { label: 'Congés',    href: '/manager/conges' },
  ]},
  { pattern: /^\/manager\/alertes$/, crumbs: () => [
    { label: 'Accueil',   href: '/manager' },
    { label: 'Alertes',   href: '/manager/alertes' },
  ]},
  { pattern: /^\/manager\/settings(\/.*)?$/, crumbs: () => [
    { label: 'Accueil',      href: '/manager' },
    { label: 'Paramètres',   href: '/manager/settings' },
  ]},
  // Employee pages
  { pattern: /^\/employee\/planning$/, crumbs: () => [
    { label: 'Accueil',      href: '/employee' },
    { label: 'Mon planning', href: '/employee/planning' },
  ]},
  { pattern: /^\/employee\/conges$/, crumbs: () => [
    { label: 'Accueil',    href: '/employee' },
    { label: 'Mes congés', href: '/employee/conges' },
  ]},
  { pattern: /^\/employee\/badgeuse$/, crumbs: () => [
    { label: 'Accueil',   href: '/employee' },
    { label: 'Badgeuse',  href: '/employee/badgeuse' },
  ]},
]

const HOME_ROUTES = new Set(['/manager', '/employee'])

export function BreadcrumbNav() {
  const pathname = usePathname()
  const router = useRouter()

  // Don't render on home pages
  if (HOME_ROUTES.has(pathname)) return null

  // Find matching crumbs
  let crumbs: Crumb[] = []
  for (const route of ROUTES) {
    const m = pathname.match(route.pattern)
    if (m) { crumbs = route.crumbs(m); break }
  }

  // Fallback: unknown route — just show a home back button
  if (crumbs.length === 0) {
    const root = pathname.startsWith('/employee') ? '/employee' : '/manager'
    crumbs = [{ label: 'Accueil', href: root }, { label: '…', href: pathname }]
  }

  const parentCrumb = crumbs[crumbs.length - 2]
  const currentCrumb = crumbs[crumbs.length - 1]

  return (
    <div className="flex items-center gap-1 px-4 h-9 border-b border-border/60 bg-background/80 backdrop-blur-sm shrink-0">
      {/* Back button */}
      <button
        onClick={() => router.push(parentCrumb.href)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pr-2 mr-1 border-r border-border/60"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {parentCrumb.label}
      </button>

      {/* Full breadcrumb trail */}
      <nav className="flex items-center gap-1 text-xs min-w-0">
        <Link href={crumbs[0].href} className="text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0">
          <Home className="h-3 w-3" />
        </Link>
        {crumbs.slice(1).map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1 min-w-0">
            <span className="text-muted-foreground/40 shrink-0">/</span>
            {i === crumbs.length - 2 ? (
              <span className="font-medium text-foreground truncate">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className={cn('text-muted-foreground hover:text-foreground transition-colors truncate')}
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </div>
  )
}
