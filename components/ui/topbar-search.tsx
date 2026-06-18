'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface Dest { label: string; href: string }

const MANAGER_DESTS: Dest[] = [
  { label: 'Planning',        href: '/manager/planning' },
  { label: 'Employés',        href: '/manager/employees' },
  { label: 'Rapport',         href: '/manager/rapport' },
  { label: 'Analytiques',     href: '/manager/analytics' },
  { label: 'Badgeuse',        href: '/manager/presences' },
  { label: 'Congés',          href: '/manager/conges' },
  { label: 'Échanges',        href: '/manager/echanges' },
  { label: 'Marketplace',     href: '/manager/marketplace' },
  { label: 'Alertes',         href: '/manager/alertes' },
  { label: 'Conformité',      href: '/manager/compliance' },
  { label: 'Exports',         href: '/manager/settings/exports' },
  { label: "Journal d'audit", href: '/manager/audit-log' },
  { label: 'Abonnement',      href: '/manager/settings/billing' },
  { label: 'Paramètres',      href: '/manager/settings' },
  { label: 'Aide',            href: '/manager/help' },
]

const EMPLOYEE_DESTS: Dest[] = [
  { label: 'Mon planning', href: '/employee/planning' },
  { label: 'Mes congés',   href: '/employee/conges' },
  { label: 'Badgeuse',     href: '/employee/badgeuse' },
  { label: 'Marketplace',  href: '/employee/marketplace' },
]

/** Quick Search (style Dhonu) — palette de navigation rapide, ⌘K pour ouvrir. */
export function TopbarSearch({ role }: { role: 'manager' | 'employee' | 'supervisor' }) {
  const router = useRouter()
  const dests = role === 'employee' ? EMPLOYEE_DESTS : MANAGER_DESTS
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = q.trim()
    ? dests.filter(d => d.label.toLowerCase().includes(q.trim().toLowerCase()))
    : dests

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

  function go(href: string) {
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
    router.push(href)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { if (results[active]) go(results[active].href) }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
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
          className="absolute left-0 top-full mt-1.5 w-full rounded-xl border bg-[var(--bg-card)] shadow-lg overflow-hidden z-50 py-1 max-h-80 overflow-y-auto scrollbar-thin"
          style={{ borderColor: 'var(--border)', animation: 'dropdownIn 0.15s ease' }}
        >
          {results.length === 0 ? (
            <p className="px-3 py-2 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Aucun résultat</p>
          ) : results.map((d, i) => (
            <button
              key={d.href}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(d.href)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors"
              style={{ color: 'var(--text-secondary)', background: i === active ? 'var(--accent-light)' : 'transparent' }}
            >
              <Search className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              {d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
