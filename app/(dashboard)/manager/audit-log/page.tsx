'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { ShieldCheck, RefreshCw, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

type AuditEntry = {
  id: string
  table_name: string
  record_id: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  performed_by: string | null
  created_at: string
  profiles: { full_name: string | null; email: string | null } | null
}

const TABLE_LABELS: Record<string, string> = {
  contracts: 'Contrats',
  leave_requests: 'Congés',
  profiles: 'Profils',
  lateness_records: 'Retards',
}

const ACTION_CFG = {
  INSERT: { label: 'Création',     style: { backgroundColor: 'var(--accent-light)', color: 'var(--accent)' } },
  UPDATE: { label: 'Modification', style: { backgroundColor: '#EFF6FF', color: '#3B82F6' } },
  DELETE: { label: 'Suppression',  style: { backgroundColor: '#FEE2E2', color: 'var(--danger)' } },
}

const TABLES  = ['contracts', 'leave_requests', 'profiles', 'lateness_records']
const ACTIONS = ['INSERT', 'UPDATE', 'DELETE'] as const

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function diffLabel(entry: AuditEntry): string {
  if (entry.action === 'INSERT') return 'Nouvel enregistrement'
  if (entry.action === 'DELETE') return 'Enregistrement supprimé'
  if (!entry.old_data || !entry.new_data) return ''
  const changed = Object.keys(entry.new_data).filter(
    k => k !== 'updated_at' && JSON.stringify(entry.old_data![k]) !== JSON.stringify(entry.new_data![k])
  )
  return changed.length === 0 ? 'Aucun changement' : `Modifié : ${changed.join(', ')}`
}

export default function AuditLogPage() {
  const [entries, setEntries]   = useState<AuditEntry[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(0)
  const [tableFilter, setTableFilter]   = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate]     = useState('')

  const PAGE_SIZE = 50

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (tableFilter)  params.set('table',  tableFilter)
    if (actionFilter) params.set('action', actionFilter)
    if (fromDate)     params.set('from',   fromDate)
    if (toDate)       params.set('to',     toDate)
    const res = await fetch(`/api/audit-log?${params}`)
    if (res.ok) {
      const json = await res.json()
      setEntries(json.data ?? [])
      setTotal(json.total ?? 0)
    }
    setLoading(false)
  }, [page, tableFilter, actionFilter, fromDate, toDate])

  useEffect(() => { load() }, [load])

  function resetPage() { setPage(0) }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-full">
      {/* Sticky header */}
      <div className="border-b border-border bg-card sticky top-11 z-10">
        <div className="px-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 h-14 flex-wrap">
            <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
            <h1 className="text-[20px] font-medium tracking-[-0.02em] shrink-0" style={{ color: 'var(--text-primary)' }}>Journal d&apos;audit</h1>
            {!loading && (
              <span className="text-xs text-muted-foreground">({total} événements)</span>
            )}

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap ml-2">
              <select
                value={tableFilter}
                onChange={e => { setTableFilter(e.target.value); resetPage() }}
                className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:outline-none focus:outline-none"
              >
                <option value="">Toutes les tables</option>
                {TABLES.map(t => <option key={t} value={t}>{TABLE_LABELS[t] ?? t}</option>)}
              </select>

              <select
                value={actionFilter}
                onChange={e => { setActionFilter(e.target.value); resetPage() }}
                className="text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground focus:outline-none focus:outline-none"
              >
                <option value="">Toutes les actions</option>
                {ACTIONS.map(a => <option key={a} value={a}>{ACTION_CFG[a].label}</option>)}
              </select>

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Du</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => { setFromDate(e.target.value); resetPage() }}
                  className="border border-border rounded-lg px-2 py-1 bg-card text-foreground text-xs focus:outline-none focus:outline-none"
                />
                <span>au</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => { setToDate(e.target.value); resetPage() }}
                  className="border border-border rounded-lg px-2 py-1 bg-card text-foreground text-xs focus:outline-none focus:outline-none"
                />
              </div>

              {(tableFilter || actionFilter || fromDate || toDate) && (
                <button
                  onClick={() => { setTableFilter(''); setActionFilter(''); setFromDate(''); setToDate(''); resetPage() }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            <button
              onClick={load}
              className="ml-auto p-1.5 rounded-md hover:bg-muted transition-colors shrink-0"
              title="Rafraîchir"
            >
              <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-5xl mx-auto space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl bg-card">
            <ShieldCheck className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-foreground">Aucun événement pour ces filtres</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les modifications de contrats, congés et profils apparaissent ici.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border">
                      {['Date', 'Table', 'Action', 'Par', 'Détail'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => (
                      <tr key={e.id} className={cn('border-b border-border/60 hover:bg-muted/30 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(e.created_at)}
                        </td>
                        <td className="px-4 py-2.5 text-xs font-medium text-foreground">
                          {TABLE_LABELS[e.table_name] ?? e.table_name}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={ACTION_CFG[e.action].style}>
                            {ACTION_CFG[e.action].label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {e.profiles?.full_name ?? e.profiles?.email ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">
                          {diffLabel(e)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Page {page + 1} sur {totalPages} ({total} événements)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
