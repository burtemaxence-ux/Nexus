'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, Search } from 'lucide-react'
import employees from '@/data/employees.json'
import shifts from '@/data/shifts.json'

function getTodayShiftEmployees(): Set<string> {
  const d = new Date().getDay()
  const todayDay = d === 0 ? 6 : d - 1
  return new Set(shifts.filter(s => s.day === todayDay).map(s => s.employee_id))
}

function demoAction() {
  toast.info('🎭 Mode démo — cette action n\'est pas disponible')
}

export default function ManagerEmployeesPage() {
  const [search, setSearch] = useState('')
  const todayPresent = getTodayShiftEmployees()

  const filtered = employees.filter(e =>
    !search.trim() ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  )

  const contractColors: Record<string, { bg: string; color: string }> = {
    'CDI 35h': { bg: 'rgba(108,99,255,0.12)', color: '#6C63FF' },
    'CDI 39h': { bg: 'rgba(108,99,255,0.12)', color: '#6C63FF' },
    'CDI 28h': { bg: 'rgba(108,99,255,0.12)', color: '#6C63FF' },
    'CDD 35h': { bg: 'rgba(255,179,71,0.12)', color: '#FFB347' },
    'Extra':   { bg: 'rgba(90,90,114,0.12)',  color: '#9090a8' },
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-11 z-20" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '0.5px solid var(--border)' }}>
        <div className="px-4 md:px-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-3 flex-wrap min-h-[56px] py-2">
            <h1 className="text-[20px] font-medium tracking-[-0.02em] shrink-0" style={{ color: 'var(--text-primary)' }}>Équipe</h1>
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
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={demoAction}
                title="Fonctionnalité démo"
                className="btn-primary cursor-not-allowed opacity-70"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Inviter
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 md:px-6 md:py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-4 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          <span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{filtered.length}</span>
            {' '}employé{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-page)', borderBottom: '0.5px solid var(--border)' }}>
                {['Employé', 'Poste', 'Contrat', 'H/sem.', 'Statut aujourd\'hui', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => {
                const present = todayPresent.has(emp.id)
                const cc = contractColors[emp.contract] ?? { bg: 'rgba(90,90,114,0.12)', color: '#9090a8' }
                return (
                  <tr key={emp.id} className="transition-colors duration-150" style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
                          <span className="text-[10px] font-medium" style={{ color: 'var(--accent)' }}>{emp.initials}</span>
                        </div>
                        <div>
                          <p className="text-[13px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>{emp.name}</p>
                          <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="dp-badge-info">{emp.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: cc.bg, color: cc.color }}>{emp.contract}</span>
                    </td>
                    <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-primary)' }}>
                      {emp.weeklyHours > 0 ? `${emp.weeklyHours}h` : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{
                        backgroundColor: present ? 'rgba(0,212,170,0.12)' : 'rgba(90,90,114,0.12)',
                        color: present ? 'var(--success)' : 'var(--text-tertiary)',
                      }}>
                        {present ? '● Présent' : '○ Repos'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={demoAction}
                        title="Fonctionnalité démo"
                        className="text-[12px] px-2 py-1 rounded-md cursor-not-allowed opacity-60 transition-colors duration-150"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Voir fiche →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {filtered.map(emp => {
            const present = todayPresent.has(emp.id)
            return (
              <button
                key={emp.id}
                onClick={demoAction}
                className="w-full flex items-center gap-3 p-4 rounded-xl text-left"
                style={{ border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
              >
                <div className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>{emp.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{emp.name}</p>
                  <p className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>{emp.role} · {emp.contract}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                      backgroundColor: present ? 'rgba(0,212,170,0.12)' : 'rgba(90,90,114,0.12)',
                      color: present ? 'var(--success)' : 'var(--text-tertiary)',
                    }}>
                      {present ? '● Présent' : '○ Repos'}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
