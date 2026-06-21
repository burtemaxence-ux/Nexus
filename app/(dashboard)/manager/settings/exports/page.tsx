'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Check, Download, Clock, AlertTriangle, CalendarOff } from 'lucide-react'

type Period = 'week' | 'month' | 'custom'

type ExportReport = {
  id: string
  label: string
  description: string
  icon: React.ReactNode
}

const REPORTS: ExportReport[] = [
  {
    id: 'hours_per_employee',
    label: 'Heures travaillées par employé',
    description: 'Total des heures pointées sur la période, par employé.',
    icon: <Clock className="h-4 w-4" style={{ color: 'var(--accent)' }} />,
  },
  {
    id: 'overtime',
    label: 'Heures supplémentaires',
    description: 'Récapitulatif des heures au-delà du contrat, par employé.',
    icon: <AlertTriangle className="h-4 w-4" style={{ color: 'var(--warning)' }} />,
  },
  {
    id: 'late',
    label: 'Retards',
    description: 'Liste des arrivées tardives avec durée de retard.',
    icon: <Clock className="h-4 w-4" style={{ color: 'var(--danger)' }} />,
  },
  {
    id: 'absences',
    label: 'Absences',
    description: 'Absences justifiées et non justifiées sur la période.',
    icon: <CalendarOff className="h-4 w-4" style={{ color: 'var(--accent)' }} />,
  },
]

function getCurrentWeek() {
  const now = new Date()
  const day = now.getDay()
  const diffToMon = (day === 0 ? -6 : 1 - day)
  const mon = new Date(now)
  mon.setDate(now.getDate() + diffToMon)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return {
    from: mon.toISOString().slice(0, 10),
    to:   sun.toISOString().slice(0, 10),
  }
}

function getCurrentMonth() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { from, to }
}

export default function ExportsPage() {
  const [period, setPeriod] = useState<Period>('week')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [exportedId, setExportedId] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  useEffect(() => {
    const { from, to } = getCurrentWeek()
    setCustomFrom(from)
    setCustomTo(to)
  }, [])

  useEffect(() => {
    if (period === 'week') {
      const { from, to } = getCurrentWeek()
      setCustomFrom(from); setCustomTo(to)
    } else if (period === 'month') {
      const { from, to } = getCurrentMonth()
      setCustomFrom(from); setCustomTo(to)
    }
  }, [period])

  async function handleExport(reportId: string) {
    setExportingId(reportId)
    setExportError(null)
    try {
      const params = new URLSearchParams({ type: reportId, from: customFrom, to: customTo })
      const res = await fetch(`/api/exports?${params}`)
      if (!res.ok) throw new Error('Export échoué')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const disposition = res.headers.get('content-disposition') ?? ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      a.download = match ? match[1] : `export_${reportId}.csv`
      a.href = url
      a.click()
      URL.revokeObjectURL(url)
      setExportedId(reportId)
      setTimeout(() => setExportedId(null), 3000)
    } catch {
      setExportError("Une erreur est survenue lors de l'export.")
    } finally {
      setExportingId(null)
    }
  }

  function periodLabel() {
    if (period === 'week') return `Semaine du ${new Date(customFrom).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${new Date(customTo).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
    if (period === 'month') return new Date(customFrom).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    if (!customFrom || !customTo) return 'Période personnalisée'
    return `${new Date(customFrom).toLocaleDateString('fr-FR')} → ${new Date(customTo).toLocaleDateString('fr-FR')}`
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-10 space-y-6">
      <div>
        <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>Exports & paie</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Exportez vos récapitulatifs au format CSV.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
              <Download className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <CardTitle className="text-base">Exporter un récapitulatif</CardTitle>
              <CardDescription>Sélectionnez la période et lancez l&apos;export (format CSV).</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Period selector */}
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Période</p>
            <div className="flex overflow-hidden w-fit" style={{ border: '0.5px solid var(--border)', borderRadius: '8px' }}>
              {(['week', 'month', 'custom'] as Period[]).map((p, i) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-4 py-1.5 text-[13px] font-medium transition-colors duration-150"
                  style={{
                    backgroundColor: period === p ? 'var(--text-primary)' : 'transparent',
                    color: period === p ? 'var(--bg-card)' : 'var(--text-tertiary)',
                    borderLeft: i > 0 ? '0.5px solid var(--border)' : undefined,
                  }}
                >
                  {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Personnalisé'}
                </button>
              ))}
            </div>

            {period === 'custom' && (
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Du</p>
                  <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-8 text-sm w-36" />
                </div>
                <div className="pt-5" style={{ color: 'var(--text-secondary)' }}>→</div>
                <div className="space-y-1">
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Au</p>
                  <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-8 text-sm w-36" />
                </div>
              </div>
            )}

            {period !== 'custom' && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{periodLabel()}</p>
            )}
          </div>

          {/* Error */}
          {exportError && (
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{ backgroundColor: '#FEE2E2', border: '0.5px solid var(--danger)', color: 'var(--danger)' }}
            >
              {exportError}
            </div>
          )}

          {/* Reports */}
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em]" style={{ color: 'var(--text-secondary)' }}>Récapitulatifs</p>
            <div className="rounded-xl overflow-hidden" style={{ border: '0.5px solid var(--border)' }}>
              {REPORTS.map((report, i) => {
                const isExporting = exportingId === report.id
                const isDone = exportedId === report.id
                return (
                  <div
                    key={report.id}
                    className="flex items-center justify-between px-4 py-3.5"
                    style={{
                      borderTop: i > 0 ? '0.5px solid var(--border)' : undefined,
                      backgroundColor: 'var(--bg-card)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--bg-page)' }}>
                        {report.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{report.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{report.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExport(report.id)}
                      disabled={isExporting}
                      className="flex items-center gap-1.5 shrink-0 ml-4 min-w-[90px] justify-center h-8 px-3 rounded-lg text-[13px] font-medium transition-colors duration-150 disabled:opacity-50"
                      style={isDone
                        ? { backgroundColor: '#F0FDF4', border: '0.5px solid #BBF7D0', color: '#15803D' }
                        : { backgroundColor: 'var(--accent-light)', border: '0.5px solid var(--accent)', color: 'var(--accent)' }
                      }
                    >
                      {isExporting
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Export…</>
                        : isDone
                        ? <><Check className="h-3.5 w-3.5" />Prêt</>
                        : <><Download className="h-3.5 w-3.5" />CSV</>
                      }
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
