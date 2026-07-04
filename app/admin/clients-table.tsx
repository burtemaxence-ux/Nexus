'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, ArrowUpDown, ChevronRight } from 'lucide-react'
import type { ClientRow } from '@/lib/admin/overview'
import { statusColor, statusLabel, planLabel } from '@/lib/admin/labels'

type SortKey = 'name' | 'employees' | 'shifts' | 'lastActivity' | 'createdAt'

function relativeDate(iso: string | null): string {
  if (!iso) return 'jamais'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} j`
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`
  return `il y a ${Math.floor(days / 365)} an(s)`
}

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [asc, setAsc] = useState(false)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? clients.filter(c =>
          c.name.toLowerCase().includes(q) || (c.ownerEmail ?? '').toLowerCase().includes(q))
      : clients
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'employees') cmp = a.employees - b.employees
      else if (sortKey === 'shifts') cmp = a.shifts - b.shifts
      else {
        const av = a[sortKey] ? new Date(a[sortKey] as string).getTime() : 0
        const bv = b[sortKey] ? new Date(b[sortKey] as string).getTime() : 0
        cmp = av - bv
      }
      return asc ? cmp : -cmp
    })
    return sorted
  }, [clients, query, sortKey, asc])

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc(a => !a)
    else { setSortKey(key); setAsc(false) }
  }

  const Th = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <th className={`px-4 py-2 text-left font-medium ${className ?? ''}`}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:opacity-80">
        {label}
        <ArrowUpDown className="h-3 w-3" style={{ opacity: sortKey === k ? 1 : 0.3 }} />
      </button>
    </th>
  )

  return (
    <div>
      <div className="relative mb-3 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher un client ou un email…"
          className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
              <Th k="name" label="Établissement" />
              <Th k="employees" label="Employés" />
              <Th k="shifts" label="Plannings" />
              <th className="px-4 py-2 text-left font-medium">Statut</th>
              <Th k="lastActivity" label="Dernière activité" />
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center" style={{ color: 'var(--text-tertiary)' }}>Aucun client trouvé.</td></tr>
            )}
            {rows.map(c => (
              <tr key={c.id} className="group transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ borderTop: '1px solid var(--border)' }}>
                <td className="px-4 py-2">
                  <Link href={`/admin/clients/${c.id}`} className="block">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                    <span className="block text-xs" style={{ color: 'var(--text-tertiary)' }}>{c.ownerEmail ?? '—'}</span>
                  </Link>
                </td>
                <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>{c.employees}</td>
                <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                  {c.shifts}
                  {!c.activated && <span className="ml-1 text-xs" style={{ color: 'var(--danger)' }}>· non activé</span>}
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(c.status) }} />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {statusLabel(c.status)}
                      {c.status === 'trialing' && c.trialDaysLeft > 0 && ` · ${c.trialDaysLeft} j`}
                    </span>
                    {c.plan && c.status === 'active' && (
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>· {planLabel(c.plan)}</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>{relativeDate(c.lastActivity)}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/clients/${c.id}`} aria-label="Voir la fiche">
                    <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100" style={{ color: 'var(--text-secondary)' }} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
