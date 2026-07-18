'use client'

import { useEffect, useState } from 'react'
import {
  Loader2, Download, Clock, AlertTriangle, Timer, CalendarOff, FileText, File,
  History, FileDown, Info, ArrowUpRight, FileSpreadsheet, Building,
} from 'lucide-react'

type Period = 'week' | 'month' | 'custom'
type Summary = { plannedHours: number; overtimeHours: number; lateCount: number; absenceCount: number }

const REPORTS = [
  { id: 'hours_per_employee', label: 'Heures travaillées', color: '#6C63FF', icon: Clock,        description: 'Total des heures pointées sur la période, par employé.' },
  { id: 'overtime',           label: 'Heures supplémentaires', color: '#f08c00', icon: AlertTriangle, description: 'Récapitulatif des heures au-delà du contrat, par employé.' },
  { id: 'late',               label: 'Retards',          color: '#fa5252', icon: Timer,       description: 'Liste des arrivées tardives avec durée de retard.' },
  { id: 'absences',           label: 'Absences',         color: '#12b886', icon: CalendarOff, description: 'Absences justifiées et non justifiées sur la période.' },
] as const

const PAYROLL_SOFTWARE = [
  { format: 'payfit',    name: 'PayFit',    emoji: '💜', tag: 'Variables de paie' },
  { format: 'adp',       name: 'ADP',       emoji: '🔵', tag: 'Variables de paie' },
  { format: 'silae',     name: 'Silae',     emoji: '🟢', tag: 'Variables de paie' },
  { format: 'generique', name: 'Générique', emoji: '📄', tag: 'CSV standard' },
] as const

type HistoryEntry = { key: string; label: string; dt: string; size: string; fmt: string }

function getCurrentWeek() {
  const now = new Date()
  const day = now.getDay()
  const diffToMon = (day === 0 ? -6 : 1 - day)
  const mon = new Date(now); mon.setDate(now.getDate() + diffToMon)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) }
}

function getCurrentMonth() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { from, to }
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  return `${(bytes / 1024).toFixed(1)} Ko`
}

export default function ExportsPage() {
  const [period, setPeriod] = useState<Period>('week')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => { const { from, to } = getCurrentWeek(); setCustomFrom(from); setCustomTo(to) }, [])

  useEffect(() => {
    if (period === 'week') { const { from, to } = getCurrentWeek(); setCustomFrom(from); setCustomTo(to) }
    else if (period === 'month') { const { from, to } = getCurrentMonth(); setCustomFrom(from); setCustomTo(to) }
  }, [period])

  // Synthèse de la période (KPIs du hero).
  useEffect(() => {
    if (!customFrom || !customTo) return
    setSummary(null)
    const ctrl = new AbortController()
    fetch(`/api/exports/summary?${new URLSearchParams({ from: customFrom, to: customTo })}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then((d: Summary | null) => { if (d) setSummary(d) })
      .catch(() => {})
    return () => ctrl.abort()
  }, [customFrom, customTo])

  async function runExport(busyKey: string, params: Record<string, string>, label: string, fmt: string, fallbackName: string) {
    setBusyKey(busyKey)
    setExportError(null)
    try {
      const res = await fetch(`/api/exports?${new URLSearchParams(params)}`)
      if (!res.ok) throw new Error('Export échoué')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const disposition = res.headers.get('content-disposition') ?? ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      a.download = match ? match[1] : fallbackName
      a.href = url
      a.click()
      URL.revokeObjectURL(url)
      setHistory(prev => [{
        key: `${busyKey}-${Date.now()}`,
        label,
        dt: new Date().toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        size: humanSize(blob.size),
        fmt,
      }, ...prev].slice(0, 8))
    } catch {
      setExportError("Une erreur est survenue lors de l'export.")
    } finally {
      setBusyKey(null)
    }
  }

  function periodLabel() {
    if (!customFrom || !customTo) return 'Période personnalisée'
    if (period === 'week') return `Semaine du ${new Date(customFrom).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${new Date(customTo).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
    if (period === 'month') return new Date(customFrom).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    return `${new Date(customFrom).toLocaleDateString('fr-FR')} → ${new Date(customTo).toLocaleDateString('fr-FR')}`
  }

  async function exportAll() {
    for (const r of REPORTS) {
      await runExport(`all-${r.id}`, { type: r.id, from: customFrom, to: customTo }, r.label, 'CSV', `export_${r.id}.csv`)
    }
  }

  return (
    <div className="nx-planpage" style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Hero + période */}
      <div className="nx-exp-hero">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, opacity: .85 }}>Exports de la période</p>
            <p style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Syne',sans-serif", letterSpacing: '-.01em', marginTop: 2 }}>{periodLabel()}</p>
          </div>
          <div className="nx-seg-wrap" style={{ width: 'fit-content', background: 'rgba(255,255,255,.14)', borderColor: 'rgba(255,255,255,.2)' }}>
            {(['week', 'month', 'custom'] as Period[]).map(p => (
              <button key={p} className={`nx-seg ${period === p ? 'on' : ''}`} onClick={() => setPeriod(p)} style={period === p ? { background: '#fff', color: 'var(--accent)' } : { color: '#fff' }}>
                {p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Perso.'}
              </button>
            ))}
          </div>
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
            <input className="nx-input" type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ height: 34, width: 160, background: 'rgba(255,255,255,.14)', borderColor: 'rgba(255,255,255,.24)', color: '#fff' }} />
            <span style={{ opacity: .7 }}>→</span>
            <input className="nx-input" type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ height: 34, width: 160, background: 'rgba(255,255,255,.14)', borderColor: 'rgba(255,255,255,.24)', color: '#fff' }} />
          </div>
        )}

        <div className="nx-expkgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 18 }}>
          {[
            { icon: Clock, label: 'Heures planifiées', value: summary?.plannedHours, unit: 'h' },
            { icon: AlertTriangle, label: 'Heures sup.', value: summary?.overtimeHours, unit: 'h' },
            { icon: Timer, label: 'Retards', value: summary?.lateCount, unit: '' },
            { icon: CalendarOff, label: 'Absences', value: summary?.absenceCount, unit: '' },
          ].map(k => {
            const Icon = k.icon
            return (
              <div key={k.label} className="nx-exp-kpi">
                <Icon className="ic14" style={{ opacity: .8 }} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{summary ? k.value : '—'}</span>
                  {k.unit && <span style={{ fontSize: 12, opacity: .8 }}>{k.unit}</span>}
                </div>
                <p style={{ fontSize: 10.5, opacity: .82, marginTop: 5 }}>{k.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {exportError && (
        <div style={{ borderRadius: 10, padding: '10px 14px', fontSize: 12, background: 'var(--sev-critical-bg)', border: '0.5px solid var(--danger)', color: 'var(--danger)' }}>{exportError}</div>
      )}

      {/* Récapitulatifs */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span className="nx-step"><FileSpreadsheet className="ic12" /></span><p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Récapitulatifs à exporter</p></div>
          <button className="nx-fmtbtn" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-light)' }} onClick={exportAll} disabled={!!busyKey}>
            {busyKey?.startsWith('all-') ? <Loader2 className="ic14 nx-spin" /> : <Download className="ic14" />}Tout exporter
          </button>
        </div>
        <div className="nx-reportgrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {REPORTS.map(rep => {
            const Icon = rep.icon
            const busy = busyKey === rep.id
            return (
              <div key={rep.id} className="nx-report">
                <div className="nx-report-ico" style={{ background: `${rep.color}1a` }}><Icon className="ic20" style={{ color: rep.color }} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{rep.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4 }}>{rep.description}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button className="nx-fmtbtn" onClick={() => runExport(rep.id, { type: rep.id, from: customFrom, to: customTo }, rep.label, 'CSV', `export_${rep.id}.csv`)} disabled={!!busyKey}>
                      {busy && busyKey === rep.id ? <Loader2 className="ic12 nx-spin" /> : <FileText className="ic12" />}CSV
                    </button>
                    <button className="nx-fmtbtn" onClick={() => runExport(`${rep.id}-pdf`, { type: rep.id, format: 'pdf', from: customFrom, to: customTo }, rep.label, 'PDF', `export_${rep.id}.pdf`)} disabled={!!busyKey}>
                      {busyKey === `${rep.id}-pdf` ? <Loader2 className="ic12 nx-spin" /> : <File className="ic12" />}PDF
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Export paie */}
      <div className="nx-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div className="nx-ico" style={{ background: 'rgba(0,169,143,.12)' }}><Building className="ic16" style={{ color: 'var(--emerald)' }} /></div>
          <div><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Transmettre à votre logiciel de paie</p><p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Variables de paie prêtes à l’import</p></div>
        </div>
        <div className="nx-paygrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          {PAYROLL_SOFTWARE.map(soft => {
            const busy = busyKey === `paie-${soft.format}`
            return (
              <button key={soft.format} className="nx-payroll" onClick={() => runExport(`paie-${soft.format}`, { type: 'paie', format: soft.format, from: customFrom, to: customTo }, `Variables de paie — ${soft.name}`, soft.name, `variables_paie_${soft.format}.csv`)} disabled={!!busyKey} style={{ textAlign: 'left' }}>
                <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{soft.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{soft.name}</p><p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{soft.tag}</p></div>
                {busy ? <Loader2 className="ic16 nx-spin" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} /> : <ArrowUpRight className="ic16" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 14, padding: '12px 14px', borderRadius: 10, background: 'var(--accent-light)' }}>
          <Info className="ic14" style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>L’export paie compile heures, heures sup., primes repas et absences de la période dans un fichier CSV de variables (codes rubriques) prêt à importer dans votre logiciel.</p>
        </div>

        {/* DSN mensuelle (pré-remplie) */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>DSN mensuelle (format NEODeS)</p>
              <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 1 }}>Fichier de déclaration sociale nominative pré-rempli avec vos données.</p>
            </div>
            <button
              className="btn-primary"
              style={{ flexShrink: 0 }}
              onClick={() => runExport('dsn', { type: 'dsn', from: customFrom, to: customTo }, 'DSN mensuelle', 'DSN', `dsn_${customFrom}.dsn`)}
              disabled={!!busyKey}
            >
              {busyKey === 'dsn' ? <Loader2 className="ic14 nx-spin" /> : <Download className="ic14" />}Télécharger la DSN
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(240,140,0,.09)', border: '0.5px solid rgba(240,140,0,.28)' }}>
            <AlertTriangle className="ic14" style={{ color: 'var(--warning)', marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Pré-remplie, non déposable en l’état.</strong> Le fichier reprend établissement, salariés, contrats, heures et absences. Les rubriques réglementaires que Nexus ne détient pas (NIR, date de naissance, adresse salarié, montants de cotisations, taux de prélèvement à la source…) restent à compléter — faites-le valider par votre gestionnaire de paie avant tout dépôt sur net-entreprises.fr.
            </p>
          </div>
        </div>
      </div>

      {/* Historique (session) */}
      <div className="nx-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '0.5px solid var(--border)' }}>
          <div className="nx-ico" style={{ background: 'var(--accent-light)' }}><History className="ic16" style={{ color: 'var(--accent)' }} /></div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Exports récents</p>
        </div>
        {history.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '20px', textAlign: 'center' }}>Vos exports de cette session apparaîtront ici.</p>
        ) : (
          <div className="nx-divide">
            {history.map(h => (
              <div key={h.key} className="nx-histrow">
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileDown className="ic14" style={{ color: 'var(--text-tertiary)' }} /></div>
                <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.label}</p><p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{h.dt} · {h.size}</p></div>
                <span className="nx-badge" style={{ background: 'var(--bg-page)', color: 'var(--text-tertiary)', flexShrink: 0 }}>{h.fmt}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
