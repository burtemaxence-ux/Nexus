'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { AlertTriangle, AlarmClock, FileText, Calendar, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'

type CddAlert = {
  contractId: string
  employeeId: string
  employeeName: string | null
  employeeEmail: string | null
  contractType: string
  endDate: string
  daysLeft: number
}

type LatenessAlert = {
  id: string
  employeeId: string
  employeeName: string | null
  date: string
  lateMinutes: number
}

type AbsenceAlert = {
  shiftId: string
  employeeId: string
  employeeName: string | null
  date: string
  startTime: string
  endTime: string
}

function daysLeft(endDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(endDate + 'T00:00:00')
  return Math.round((end.getTime() - today.getTime()) / 86400000)
}

function formatDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AlertesPage() {
  const [loading, setLoading] = useState(true)
  const [cddAlerts, setCddAlerts] = useState<CddAlert[]>([])
  const [latenessAlerts, setLatenessAlerts] = useState<LatenessAlert[]>([])
  const [absenceAlerts, setAbsenceAlerts] = useState<AbsenceAlert[]>([])
  const [cddEnabled, setCddEnabled] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const today = new Date().toISOString().slice(0, 10)
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    const ago7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    const [settingsRes, cddRes, latenessRes, shiftsRes, presencesRes] = await Promise.all([
      supabase.from('settings').select('key, value').in('key', ['automation_rules']),
      supabase
        .from('contracts')
        .select('id, employee_id, type, end_date, profiles:employee_id(id, full_name, email)')
        .not('end_date', 'is', null)
        .gte('end_date', today)
        .lte('end_date', in30)
        .order('end_date'),
      supabase
        .from('lateness_records')
        .select('id, employee_id, date, late_minutes, profiles:employee_id(full_name, email)')
        .eq('justified', false)
        .gte('date', ago7)
        .order('date', { ascending: false }),
      supabase
        .from('shifts')
        .select('id, employee_id, date, start_time, end_time, profiles:employee_id(full_name, email)')
        .gte('date', ago7)
        .lt('date', today),
      supabase
        .from('presences')
        .select('employee_id, date, clock_in')
        .gte('date', ago7)
        .lt('date', today)
        .not('clock_in', 'is', null),
    ])

    // Parse automation rules for cdd_expiry flag
    if (settingsRes.data) {
      const row = settingsRes.data.find(r => r.key === 'automation_rules')
      if (row?.value) {
        try {
          const rules = JSON.parse(row.value)
          setCddEnabled(rules.alert_cdd_expiry !== false)
        } catch { /* keep default */ }
      }
    }

    // CDD alerts
    const cdds: CddAlert[] = ((cddRes.data ?? []) as unknown as {
      id: string; employee_id: string; type: string; end_date: string;
      profiles: { full_name: string | null; email: string | null } | null
    }[]).map(c => ({
      contractId: c.id,
      employeeId: c.employee_id,
      employeeName: c.profiles?.full_name ?? null,
      employeeEmail: c.profiles?.email ?? null,
      contractType: c.type,
      endDate: c.end_date,
      daysLeft: daysLeft(c.end_date),
    }))
    setCddAlerts(cdds)

    // Lateness alerts
    const lateness: LatenessAlert[] = ((latenessRes.data ?? []) as unknown as {
      id: string; employee_id: string; date: string; late_minutes: number;
      profiles: { full_name: string | null; email: string | null } | null
    }[]).map(r => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: r.profiles?.full_name ?? null,
      date: r.date,
      lateMinutes: r.late_minutes,
    }))
    setLatenessAlerts(lateness)

    // Absence alerts: shifts with no presence record on that day
    const presenceSet = new Set(
      ((presencesRes.data ?? []) as { employee_id: string; date: string }[])
        .map(p => `${p.employee_id}__${p.date}`)
    )
    const yesterday_shifts = ((shiftsRes.data ?? []) as unknown as {
      id: string; employee_id: string; date: string; start_time: string; end_time: string;
      profiles: { full_name: string | null; email: string | null } | null
    }[])
    const absences: AbsenceAlert[] = yesterday_shifts
      .filter(s => !presenceSet.has(`${s.employee_id}__${s.date}`) && s.date === yesterday)
      .map(s => ({
        shiftId: s.id,
        employeeId: s.employee_id,
        employeeName: s.profiles?.full_name ?? null,
        date: s.date,
        startTime: s.start_time.slice(0, 5),
        endTime: s.end_time.slice(0, 5),
      }))
    setAbsenceAlerts(absences)

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const totalAlerts = (cddEnabled ? cddAlerts.length : 0) + latenessAlerts.length + absenceAlerts.length

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 h-14">
            <h1 className="text-lg font-semibold text-foreground">Alertes</h1>
            {!loading && totalAlerts > 0 && (
              <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {totalAlerts}
              </span>
            )}
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

      <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : totalAlerts === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl bg-card">
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-foreground">Aucune alerte active</p>
            <p className="text-xs text-muted-foreground mt-1">Tout est en ordre pour le moment.</p>
          </div>
        ) : (
          <>
            {/* CDDs expirant bientôt */}
            {cddEnabled && cddAlerts.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-foreground">
                    CDD expirant dans les 30 jours
                    <span className="ml-2 text-xs font-normal text-muted-foreground">({cddAlerts.length})</span>
                  </h2>
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 border-b border-border">
                        {['Employé', 'Type contrat', 'Fin le', 'Délai'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cddAlerts.map((a, i) => (
                        <tr key={a.contractId} className={cn('border-b border-border/60 hover:bg-muted/30 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                          <td className="px-4 py-3">
                            <Link href={`/manager/employees/${a.employeeId}`} className="font-medium text-foreground hover:text-primary transition-colors">
                              {a.employeeName ?? a.employeeEmail ?? '—'}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{a.contractType}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(a.endDate)}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'text-xs font-semibold px-2 py-0.5 rounded-full',
                              a.daysLeft <= 7
                                ? 'bg-red-100 text-red-700'
                                : a.daysLeft <= 15
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-amber-100 text-amber-700',
                            )}>
                              {a.daysLeft === 0 ? 'Aujourd\'hui' : `J-${a.daysLeft}`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Retards non justifiés */}
            {latenessAlerts.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlarmClock className="h-4 w-4 text-orange-500" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Retards non justifiés (7 derniers jours)
                    <span className="ml-2 text-xs font-normal text-muted-foreground">({latenessAlerts.length})</span>
                  </h2>
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 border-b border-border">
                        {['Employé', 'Date', 'Retard'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {latenessAlerts.map((a, i) => (
                        <tr key={a.id} className={cn('border-b border-border/60 hover:bg-muted/30 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                          <td className="px-4 py-3">
                            <Link href={`/manager/employees/${a.employeeId}`} className="font-medium text-foreground hover:text-primary transition-colors">
                              {a.employeeName ?? '—'}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground capitalize">
                            {new Date(a.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              +{a.lateMinutes} min
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Absences non pointées (hier) */}
            {absenceAlerts.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-red-500" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Absences non pointées (hier)
                    <span className="ml-2 text-xs font-normal text-muted-foreground">({absenceAlerts.length})</span>
                  </h2>
                </div>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 border-b border-border">
                        {['Employé', 'Shift prévu'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {absenceAlerts.map((a, i) => (
                        <tr key={a.shiftId} className={cn('border-b border-border/60 hover:bg-muted/30 transition-colors', i % 2 === 1 && 'bg-muted/10')}>
                          <td className="px-4 py-3">
                            <Link href={`/manager/employees/${a.employeeId}`} className="font-medium text-foreground hover:text-primary transition-colors">
                              {a.employeeName ?? '—'}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {a.startTime} → {a.endTime}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          Configurer les alertes dans{' '}
          <Link href="/manager/settings/alertes" className="underline hover:text-foreground">
            Paramètres → Notifications
          </Link>
        </p>
      </div>
    </div>
  )
}
