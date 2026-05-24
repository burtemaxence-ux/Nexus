'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  UserPlus, Users, Pencil, Search, Download,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown,
} from 'lucide-react'
import DeleteEmployeeButton from './delete-employee-button'
import ResendLinkButton from './resend-link-button'

export type Employee = {
  id: string
  full_name: string | null
  email: string | null
  position: string | null
  contract_type: string | null
  weekly_hours: number | null
  phone: string | null
  created_at: string
  archived: boolean
}

type SortField = 'full_name' | 'position' | 'contract_type' | 'weekly_hours' | 'created_at'
type SortDir = 'asc' | 'desc'

const CONTRACT_TYPES = ['CDI 35h', 'CDI 28h', 'CDD', 'CDD Saisonnier', 'Extra']

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function exportCSV(employees: Employee[]) {
  const headers = ['Nom', 'Email', 'Téléphone', 'Poste', 'Contrat', 'H/sem.', 'Date arrivée']
  const rows = employees.map(e => [
    e.full_name ?? '',
    e.email ?? '',
    e.phone ?? '',
    e.position ?? '',
    e.contract_type ?? '',
    e.weekly_hours?.toString() ?? '',
    formatDate(e.created_at),
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `equipe-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  initialEmployees: Employee[]
}

export default function EmployeesClient({ initialEmployees }: Props) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees)
  const [loading, setLoading] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [search, setSearch] = useState('')
  const [filterContract, setFilterContract] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, position, contract_type, weekly_hours, phone, created_at, archived')
      .eq('role', 'employee')
      .order('created_at', { ascending: false })

    if (!showArchived) query = query.eq('archived', false)
    const { data } = await query
    setEmployees((data ?? []) as Employee[])
    setLoading(false)
  }, [showArchived])

  // Skip initial mount — server already provided the data
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    fetchEmployees()
  }, [fetchEmployees])

  const positions = useMemo(() => {
    const set = new Set(employees.map(e => e.position).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [employees])

  const filtered = useMemo(() => {
    let list = [...employees]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        (e.full_name ?? '').toLowerCase().includes(q) ||
        (e.email ?? '').toLowerCase().includes(q) ||
        (e.position ?? '').toLowerCase().includes(q)
      )
    }
    if (filterContract) list = list.filter(e => e.contract_type === filterContract)
    if (filterPosition) list = list.filter(e => e.position === filterPosition)

    list.sort((a, b) => {
      let av: string | number | null
      let bv: string | number | null
      if (sortField === 'weekly_hours') {
        av = a.weekly_hours ?? -1
        bv = b.weekly_hours ?? -1
      } else {
        av = (a[sortField] ?? '').toString().toLowerCase()
        bv = (b[sortField] ?? '').toString().toLowerCase()
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [employees, search, filterContract, filterPosition, sortField, sortDir])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 ml-1 inline" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-primary ml-1 inline" />
      : <ArrowDown className="h-3 w-3 text-primary ml-1 inline" />
  }

  const activeFilters = [filterContract, filterPosition, search.trim()].filter(Boolean).length

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-3 h-14 flex-wrap">
            <h1 className="text-lg font-semibold text-foreground shrink-0">Équipe</h1>

            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Contract filter */}
            <div className="relative">
              <select
                value={filterContract}
                onChange={e => setFilterContract(e.target.value)}
                className={cn(
                  'appearance-none text-sm border rounded-lg pl-3 pr-7 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30',
                  filterContract ? 'border-primary text-primary font-medium' : 'border-border'
                )}
              >
                <option value="">Tous les contrats</option>
                {CONTRACT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Position filter */}
            {positions.length > 0 && (
              <div className="relative">
                <select
                  value={filterPosition}
                  onChange={e => setFilterPosition(e.target.value)}
                  className={cn(
                    'appearance-none text-sm border rounded-lg pl-3 pr-7 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30',
                    filterPosition ? 'border-primary text-primary font-medium' : 'border-border'
                  )}
                >
                  <option value="">Tous les postes</option>
                  {positions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            )}

            {/* Clear filters */}
            {activeFilters > 0 && (
              <button
                onClick={() => { setSearch(''); setFilterContract(''); setFilterPosition('') }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Effacer ({activeFilters})
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              {/* Archived toggle */}
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={e => setShowArchived(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-primary"
                />
                Archivés
              </label>

              {/* CSV export */}
              <button
                onClick={() => exportCSV(filtered)}
                disabled={filtered.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg bg-card hover:bg-muted transition-colors text-foreground disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </button>

              {/* Invite */}
              <Link
                href="/manager/employees/new"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Inviter
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-6xl mx-auto">
        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Chargement…
            </span>
          ) : (
            <span>
              <span className="font-semibold text-foreground">{filtered.length}</span>
              {' '}employé{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== employees.length && ` sur ${employees.length}`}
            </span>
          )}
          {filterContract && (
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">{filterContract}</span>
          )}
          {filterPosition && (
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">{filterPosition}</span>
          )}
        </div>

        {filtered.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl bg-card">
            <Users className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">
              {employees.length === 0 ? 'Aucun employé pour l\'instant' : 'Aucun résultat'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {employees.length === 0
                ? 'Invitez votre premier employé.'
                : 'Essayez de modifier vos filtres.'}
            </p>
            {employees.length === 0 && (
              <Link
                href="/manager/employees/new"
                className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
              >
                <UserPlus className="h-4 w-4" />Inviter un employé
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60 border-b border-border">
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('full_name')}
                        className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                      >
                        Employé<SortIcon field="full_name" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('position')}
                        className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                      >
                        Poste<SortIcon field="position" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('contract_type')}
                        className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                      >
                        Contrat<SortIcon field="contract_type" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSort('weekly_hours')}
                        className="flex items-center ml-auto text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                      >
                        H/sem.<SortIcon field="weekly_hours" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Téléphone
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('created_at')}
                        className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                      >
                        Arrivée<SortIcon field="created_at" />
                      </button>
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp, i) => (
                    <tr
                      key={emp.id}
                      className={cn(
                        'border-b border-border/60 hover:bg-muted/30 transition-colors',
                        i % 2 === 1 && 'bg-muted/10',
                        emp.archived && 'opacity-50',
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-primary">
                              {getInitials(emp.full_name ?? emp.email ?? '?')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground leading-tight">
                              {emp.full_name ?? '—'}
                              {emp.archived && (
                                <span className="ml-2 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                  Archivé
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {emp.position
                          ? <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">{emp.position}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {emp.contract_type
                          ? <span className="text-xs border border-border text-foreground px-2 py-0.5 rounded-full">{emp.contract_type}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">
                        {emp.weekly_hours ? `${emp.weekly_hours}h` : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {emp.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(emp.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Link
                            href={`/manager/employees/${emp.id}`}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Pencil className="h-3 w-3" />Modifier
                          </Link>
                          <ResendLinkButton employee={emp} />
                          <DeleteEmployeeButton employee={emp} onDeleted={fetchEmployees} />
                        </div>
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
