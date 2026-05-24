'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { ShieldCheck, RefreshCw, Loader2, Filter } from 'lucide-react'

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
  INSERT: { label: 'Création',     bg: 'bg-emerald-100 text-emerald-700' },
  UPDATE: { label: 'Modification', bg: 'bg-blue-100 text-blue-700' },
  DELETE: { label: 'Suppression',  bg: 'bg-red-100 text-red-700' },
}

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
  if (changed.length === 0) return 'Aucun changement détecté'
  return `Champs modifiés : ${changed.join(', ')}`
}

const TABLES = ['', 'contracts', 'leave_requests', 'profiles', 'lateness_records']

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tableFilter, setTableFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '100' })
    if (tableFilter) params.set('table', tableFilter)
    const res = await fetch(`/api/audit-log?${params}`)
    if (res.ok) setEntries(await res.json())
    setLoading(false)
  }, [tableFilter])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 h-14">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">Journal d&apos;audit</h1>
            {!loading && (
              <span className="text-xs text-muted-foreground">({entries.length} événements)</span>
            )}

            {/* Table filter */}
            <div className="flex items-center gap-1.5 ml-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={tableFilter}
                onChange={e => setTableFilter(e.target.value)}
                className="text-sm border border-border rounded-lg pl-2 pr-6 py-1 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
              >
                <option value="">Toutes les tables</option>
                {TABLES.slice(1).map(t => (
                  <option key={t} value={t}>{TABLE_LABELS[t] ?? t}</option>
                ))}
              </select>
            </div>

            <button
              onClick={load}
              className="ml-auto p-1.5 rounded-md hover:bg-muted transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-5xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl bg-card">
            <ShieldCheck className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-foreground">Aucun événement enregistré</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les modifications de contrats, congés et profils apparaîtront ici.
            </p>
          </div>
        ) : (
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
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', ACTION_CFG[e.action].bg)}>
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
        )}
      </div>
    </div>
  )
}
