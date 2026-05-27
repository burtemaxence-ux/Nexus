'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  UserPlus, Users, Pencil, Search, Download,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight,
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
  callerRole?: 'manager' | 'supervisor' | 'employee'
}

export default function EmployeesClient({ initialEmployees, callerRole = 'manager' }: Props) {
  const isManager = callerRole === 'manager'
  const [tbodyRef] = useAutoAnimate()
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
      <div className="sticky top-14 md:top-11 z-20" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '0.5px solid var(--border)' }}>
        <div className="px-4 md:px-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap min-h-[56px] py-2">
            <h1 className="text-[20px] font-medium tracking-[-0.02em] shrink-0" style={{ color: 'var(--text-primary)' }}>Équipe</h1>

            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                placeholder="Rechercher…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="dp-input pl-8"
              />
            </div>

            {/* Contract filter */}
            <div className="relative hidden md:block">
              <select
                value={filterContract}
                onChange={e => setFilterContract(e.target.value)}
                className={cn(
                  'dp-input appearance-none pr-7',
                  filterContract ? 'border-[var(--accent)] text-[var(--accent)]' : ''
                )}
                style={{ width: 'auto' }}
              >
                <option value="">Tous les contrats</option>
                {CONTRACT_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            </div>

            {/* Position filter */}
            {positions.length > 0 && (
              <div className="relative hidden md:block">
                <select
                  value={filterPosition}
                  onChange={e => setFilterPosition(e.target.value)}
                  className={cn(
                    'dp-input appearance-none pr-7',
                    filterPosition ? 'border-[var(--accent)] text-[var(--accent)]' : ''
                  )}
                  style={{ width: 'auto' }}
                >
                  <option value="">Tous les postes</option>
                  {positions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
              </div>
            )}

            {/* Clear filters */}
            {activeFilters > 0 && (
              <button
                onClick={() => { setSearch(''); setFilterContract(''); setFilterPosition('') }}
                className="text-[12px] underline transition-colors duration-150"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Effacer ({activeFilters})
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              {/* Archived toggle */}
              <label className="hidden md:flex items-center gap-1.5 text-[12px] cursor-pointer select-none" style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={e => setShowArchived(e.target.checked)}
                  className="w-3.5 h-3.5 rounded"
                />
                Archivés
              </label>

              {/* CSV export */}
              <button
                onClick={() => exportCSV(filtered)}
                disabled={filtered.length === 0}
                className="hidden md:flex btn-secondary items-center gap-1.5 disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </button>

              {/* Invite — manager only */}
              {isManager && (
                <Link href="/manager/employees/new" className="btn-primary">
                  <UserPlus className="h-3.5 w-3.5" />
                  Inviter
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 md:px-6 md:py-6 max-w-6xl mx-auto">
        {/* Stats bar */}
        <div className="flex items-center gap-3 mb-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              Chargement…
            </span>
          ) : (
            <span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{filtered.length}</span>
              {' '}employé{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== employees.length && ` sur ${employees.length}`}
            </span>
          )}
          {filterContract && <span className="dp-badge-info">{filterContract}</span>}
          {filterPosition && <span className="dp-badge-info">{filterPosition}</span>}
        </div>

        {filtered.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl" style={{ border: '0.5px dashed var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <Users className="h-8 w-8 mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {employees.length === 0 ? 'Aucun employé pour l\'instant' : 'Aucun résultat'}
            </p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              {employees.length === 0 ? 'Invitez votre premier employé.' : 'Essayez de modifier vos filtres.'}
            </p>
            {employees.length === 0 && isManager && (
              <Link href="/manager/employees/new" className="btn-primary mt-4">
                <UserPlus className="h-3.5 w-3.5" />Inviter un employé
              </Link>
            )}
          </div>
        ) : (
          <>
          {/* Mobile: card list */}
          <div className="block md:hidden space-y-2">
            {filtered.map(emp => (
              <Link
                key={emp.id}
                href={`/manager/employees/${emp.id}`}
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)', opacity: emp.archived ? 0.5 : 1 }}
              >
                <div className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
                    {getInitials(emp.full_name ?? emp.email ?? '?')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                    {emp.full_name ?? '—'}
                    {emp.archived && <span className="ml-2 dp-badge-info">Archivé</span>}
                  </p>
                  <p className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>{emp.email}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {emp.position && <span className="dp-badge-info">{emp.position}</span>}
                    {emp.contract_type && <span className="dp-badge-info">{emp.contract_type}</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-page)', borderBottom: '0.5px solid var(--border)' }}>
                    {(['full_name', 'position', 'contract_type'] as const).map((field, idx) => (
                      <th key={field} className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort(field)}
                          className="flex items-center transition-colors duration-150"
                          style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}
                        >
                          {['Employé', 'Poste', 'Contrat'][idx]}<SortIcon field={field} />
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSort('weekly_hours')}
                        className="flex items-center ml-auto transition-colors duration-150"
                        style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}
                      >
                        H/sem.<SortIcon field="weekly_hours" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
                      Téléphone
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('created_at')}
                        className="flex items-center transition-colors duration-150"
                        style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}
                      >
                        Arrivée<SortIcon field="created_at" />
                      </button>
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody ref={tbodyRef}>
                  {filtered.map((emp) => (
                    <tr
                      key={emp.id}
                      className="transition-colors duration-150"
                      style={{
                        borderBottom: '0.5px solid var(--border)',
                        opacity: emp.archived ? 0.5 : 1,
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: 'var(--accent-light)' }}>
                            <span className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>
                              {getInitials(emp.full_name ?? emp.email ?? '?')}
                            </span>
                          </div>
                          <div>
                            <p className="text-[13px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                              {emp.full_name ?? '—'}
                              {emp.archived && <span className="ml-2 dp-badge-info">Archivé</span>}
                            </p>
                            <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {emp.position
                          ? <span className="dp-badge-info">{emp.position}</span>
                          : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {emp.contract_type
                          ? <span className="dp-badge-info">{emp.contract_type}</span>
                          : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px]" style={{ color: 'var(--text-primary)' }}>
                        {emp.weekly_hours ? `${emp.weekly_hours}h` : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        {emp.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(emp.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Link
                            href={`/manager/employees/${emp.id}`}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[12px] transition-colors duration-150"
                            style={{ color: 'var(--text-secondary)' }}
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
          </>
        )}
      </div>
    </div>
  )
}
