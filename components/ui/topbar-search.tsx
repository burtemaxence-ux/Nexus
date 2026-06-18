'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Search, Star } from 'lucide-react'

interface Dest { label: string; href: string }

const MANAGER_DESTS: Dest[] = [
  { label: 'Accueil',        href: '/manager' },
  { label: 'Planning',        href: '/manager/planning' },
  { label: 'Badgeuse',        href: '/manager/presences' },
  { label: 'Employés',        href: '/manager/employees' },
  { label: 'Congés',          href: '/manager/conges' },
  { label: 'Échanges',        href: '/manager/echanges' },
  { label: 'Marketplace',     href: '/manager/marketplace' },
  { label: 'Conformité',      href: '/manager/compliance' },
  { label: 'Alertes',         href: '/manager/alertes' },
  { label: 'Rapport',         href: '/manager/rapport' },
  { label: 'Analytiques',     href: '/manager/analytics' },
  { label: "Journal d'audit", href: '/manager/audit-log' },
  { label: 'Paramètres',      href: '/manager/settings' },
  { label: 'Exports',         href: '/manager/settings/exports' },
  { label: 'Abonnement',      href: '/manager/settings/billing' },
  { label: 'Aide',            href: '/manager/help' },
]

const EMPLOYEE_DESTS: Dest[] = [
  { label: 'Accueil',      href: '/employee' },
  { label: 'Mon planning', href: '/employee/planning' },
  { label: 'Mes congés',   href: '/employee/conges' },
  { label: 'Badgeuse',     href: '/employee/badgeuse' },
  { label: 'Marketplace',  href: '/employee/marketplace' },
]

const FAV_KEY = 'qb-nav-favorites'
const RECENT_KEY = 'qb-nav-recents'
const MAX_RECENTS = 4

function loadList(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}
function saveList(key: string, v: string[]) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* ignore */ }
}

/** Quick Search (style Dhonu) — palette de navigation : favoris, récents, toutes les pages, ⌘K. */
export function TopbarSearch({ role }: { role: 'manager' | 'employee' | 'supervisor' }) {
  const router = useRouter()
  const pathname = usePathname()
  const dests = role === 'employee' ? EMPLOYEE_DESTS : MANAGER_DESTS
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [favorites, setFavorites] = useState<string[]>([])
  const [recents, setRecents] = useState<string[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setFavorites(loadList(FAV_KEY))
    setRecents(loadList(RECENT_KEY))
  }, [])

  // Mémorise la page courante dans les récents (mappée vers sa destination connue).
  useEffect(() => {
    const list = role === 'employee' ? EMPLOYEE_DESTS : MANAGER_DESTS
    const match = list
      .filter(d => pathname === d.href || pathname.startsWith(d.href + '/'))
      .sort((a, b) => b.href.length - a.href.length)[0]
    if (!match) return
    setRecents(prev => {
      const next = [match.href, ...prev.filter(h => h !== match.href)].slice(0, MAX_RECENTS)
      saveList(RECENT_KEY, next)
      return next
    })
  }, [pathname, role])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function toggleFav(href: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setFavorites(prev => {
      const next = prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
      saveList(FAV_KEY, next)
      return next
    })
  }

  function go(href: string) {
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
    router.push(href)
  }

  // ── Sections affichées ────────────────────────────────────────────────────
  const query = q.trim().toLowerCase()
  const byHref = (href: string) => dests.find(d => d.href === href)

  let sections: { title: string | null; items: Dest[] }[]
  if (query) {
    sections = [{ title: null, items: dests.filter(d => d.label.toLowerCase().includes(query)) }]
  } else {
    const favItems = favorites.map(byHref).filter((d): d is Dest => !!d)
    const recentItems = recents.map(byHref).filter((d): d is Dest => !!d && !favorites.includes(d.href))
    const shown = new Set([...favItems, ...recentItems].map(d => d.href))
    const allItems = dests.filter(d => !shown.has(d.href))
    sections = [
      ...(favItems.length ? [{ title: 'Favoris', items: favItems }] : []),
      ...(recentItems.length ? [{ title: 'Récents', items: recentItems }] : []),
      { title: 'Toutes les pages', items: allItems },
    ]
  }
  const flat = sections.flatMap(s => s.items)

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { if (flat[active]) go(flat[active].href) }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
  }

  function Row({ d }: { d: Dest }) {
    const idx = flat.findIndex(x => x.href === d.href)
    const isFav = favorites.includes(d.href)
    return (
      <button
        onMouseEnter={() => setActive(idx)}
        onClick={() => go(d.href)}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors"
        style={{ color: 'var(--text-secondary)', background: idx === active ? 'var(--accent-light)' : 'transparent' }}
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        <span className="flex-1 truncate">{d.label}</span>
        <span
          role="button"
          tabIndex={-1}
          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          onClick={(e) => toggleFav(d.href, e)}
          className="p-1 -m-1 rounded hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
        >
          <Star
            className="h-3.5 w-3.5"
            style={{ color: isFav ? 'var(--accent)' : 'var(--text-tertiary)', fill: isFav ? 'var(--accent)' : 'none' }}
          />
        </span>
      </button>
    )
  }

  return (
    <div className="relative w-full max-w-xs" ref={ref}>
      <div
        className="flex items-center gap-2 h-9 px-3 rounded-lg border"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}
      >
        <Search className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        <input
          ref={inputRef}
          value={q}
          onChange={e => { setQ(e.target.value); setActive(0); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Rechercher…"
          aria-label="Recherche rapide"
          className="flex-1 min-w-0 bg-transparent text-[13px] outline-none placeholder:text-[var(--text-tertiary)]"
          style={{ color: 'var(--text-primary)' }}
        />
        <kbd
          className="hidden lg:inline text-[10px] px-1.5 py-0.5 rounded border leading-none"
          style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border)' }}
        >
          ⌘K
        </kbd>
      </div>

      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 w-full rounded-xl border bg-[var(--bg-card)] shadow-lg overflow-hidden z-50 py-1 max-h-96 overflow-y-auto scrollbar-thin"
          style={{ borderColor: 'var(--border)', animation: 'dropdownIn 0.15s ease' }}
        >
          {flat.length === 0 ? (
            <p className="px-3 py-2 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Aucun résultat</p>
          ) : (
            sections.map((s, si) => (
              <div key={si}>
                {s.title && (
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-tertiary)' }}>
                    {s.title}
                  </p>
                )}
                {s.items.map(d => <Row key={d.href} d={d} />)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
