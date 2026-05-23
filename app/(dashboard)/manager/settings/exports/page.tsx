'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Check, Download, FileText, Clock, AlertTriangle, CalendarOff } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type Format = 'PDF' | 'Excel' | 'CSV'
type Period = 'week' | 'month' | 'custom'

type ExportReport = {
  id: string
  label: string
  description: string
  icon: React.ReactNode
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FORMATS: Format[] = ['PDF', 'Excel', 'CSV']

const REPORTS: ExportReport[] = [
  {
    id: 'hours_per_employee',
    label: 'Heures travaillées par employé',
    description: 'Total des heures pointées sur la période, par employé.',
    icon: <Clock className="h-4 w-4 text-blue-500" />,
  },
  {
    id: 'overtime',
    label: 'Heures supplémentaires',
    description: 'Récapitulatif des heures au-delà du contrat, par employé.',
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  },
  {
    id: 'late',
    label: 'Retards',
    description: 'Liste des arrivées tardives avec durée de retard.',
    icon: <Clock className="h-4 w-4 text-red-500" />,
  },
  {
    id: 'absences',
    label: 'Absences',
    description: 'Absences justifiées et non justifiées sur la période.',
    icon: <CalendarOff className="h-4 w-4 text-violet-500" />,
  },
]

// ── Helper — get current week bounds ─────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExportsPage() {
  const [loadingSettings, setLoadingSettings] = useState(true)

  // Format config (persisted)
  const [enabledFormats, setEnabledFormats] = useState<Record<Format, boolean>>({
    PDF: true, Excel: true, CSV: true,
  })
  const [savingConfig, setSavingConfig] = useState(false)
  const [savedConfig, setSavedConfig] = useState(false)

  // Export state
  const [selectedFormat, setSelectedFormat] = useState<Format>('PDF')
  const [period, setPeriod] = useState<Period>('week')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [exportedId, setExportedId] = useState<string | null>(null)

  useEffect(() => {
    const { from, to } = getCurrentWeek()
    setCustomFrom(from)
    setCustomTo(to)

    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        if (data.export_formats_config) {
          try {
            const parsed = JSON.parse(data.export_formats_config)
            setEnabledFormats(prev => ({ ...prev, ...parsed }))
          } catch { /* keep defaults */ }
        }
        if (data.export_default_format) {
          setSelectedFormat(data.export_default_format as Format)
        }
        setLoadingSettings(false)
      })
      .catch(() => setLoadingSettings(false))
  }, [])

  // Keep custom date range in sync with period presets
  useEffect(() => {
    if (period === 'week') {
      const { from, to } = getCurrentWeek()
      setCustomFrom(from); setCustomTo(to)
    } else if (period === 'month') {
      const { from, to } = getCurrentMonth()
      setCustomFrom(from); setCustomTo(to)
    }
  }, [period])

  function toggleFormat(fmt: Format) {
    setEnabledFormats(prev => ({ ...prev, [fmt]: !prev[fmt] }))
  }

  async function saveConfig() {
    setSavingConfig(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        export_formats_config: JSON.stringify(enabledFormats),
        export_default_format: selectedFormat,
      }),
    })
    setSavingConfig(false)
    setSavedConfig(true)
    setTimeout(() => setSavedConfig(false), 2500)
  }

  async function handleExport(reportId: string) {
    setExportingId(reportId)
    // Simulate export preparation (replace with real API call when ready)
    await new Promise(r => setTimeout(r, 1800))
    setExportingId(null)
    setExportedId(reportId)
    setTimeout(() => setExportedId(null), 3000)
  }

  function periodLabel() {
    if (period === 'week') return `Semaine du ${new Date(customFrom).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${new Date(customTo).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
    if (period === 'month') return new Date(customFrom).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    if (!customFrom || !customTo) return 'Période personnalisée'
    return `${new Date(customFrom).toLocaleDateString('fr-FR')} → ${new Date(customTo).toLocaleDateString('fr-FR')}`
  }

  if (loadingSettings) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const activeFormats = FORMATS.filter(f => enabledFormats[f])

  return (
    <div className="max-w-2xl mx-auto px-8 py-10 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Exports & paie</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configurez les formats disponibles et exportez vos récapitulatifs.
        </p>
      </div>

      {/* ── Formats disponibles ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <CardTitle className="text-base">Formats d&apos;export</CardTitle>
              <CardDescription>Activez les formats proposés lors d&apos;un export.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            {FORMATS.map(fmt => (
              <button
                key={fmt}
                onClick={() => toggleFormat(fmt)}
                className={cn(
                  'flex-1 h-10 rounded-lg border text-sm font-medium transition-colors',
                  enabledFormats[fmt]
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                )}
              >
                {fmt}
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={saveConfig} disabled={savingConfig} className="gap-2">
              {savingConfig
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Enregistrement…</>
                : savedConfig
                ? <><Check className="h-3.5 w-3.5" />Enregistré</>
                : 'Enregistrer la configuration'
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Exports ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <Download className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Exporter un récapitulatif</CardTitle>
              <CardDescription>Sélectionnez la période et le format, puis lancez l&apos;export.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Period selector */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Période</p>
            <div className="flex rounded-lg border border-border overflow-hidden text-sm w-fit">
              {(['week', 'month', 'custom'] as Period[]).map((p, i) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-4 py-2 font-medium transition-colors',
                    i > 0 && 'border-l border-border',
                    period === p
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Personnalisé'}
                </button>
              ))}
            </div>

            {period === 'custom' && (
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Du</p>
                  <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-8 text-sm w-36" />
                </div>
                <div className="pt-5 text-muted-foreground">→</div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Au</p>
                  <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-8 text-sm w-36" />
                </div>
              </div>
            )}

            {period !== 'custom' && (
              <p className="text-xs text-muted-foreground">{periodLabel()}</p>
            )}
          </div>

          {/* Format selector */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Format</p>
            {activeFormats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun format activé. Configurez les formats ci-dessus.</p>
            ) : (
              <div className="flex gap-2">
                {activeFormats.map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setSelectedFormat(fmt)}
                    className={cn(
                      'px-4 py-1.5 rounded-md border text-sm font-medium transition-colors',
                      selectedFormat === fmt
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reports */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Récapitulatifs</p>
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {REPORTS.map(report => {
                const isExporting = exportingId === report.id
                const isDone = exportedId === report.id
                return (
                  <div key={report.id} className="flex items-center justify-between px-4 py-3.5 bg-card hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {report.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{report.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isDone ? 'outline' : 'default'}
                      onClick={() => handleExport(report.id)}
                      disabled={isExporting || activeFormats.length === 0}
                      className={cn('gap-1.5 shrink-0 ml-4 min-w-[90px]', isDone && 'border-emerald-300 text-emerald-700 bg-emerald-50')}
                    >
                      {isExporting
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Export…</>
                        : isDone
                        ? <><Check className="h-3.5 w-3.5" />Prêt</>
                        : <><Download className="h-3.5 w-3.5" />{selectedFormat}</>
                      }
                    </Button>
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
