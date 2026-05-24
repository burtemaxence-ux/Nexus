import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// ── CSV helpers ───────────────────────────────────────────────────────────────

function escape(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(headers: string[], rows: (string | number | boolean | null)[][]): string {
  const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))]
  return '﻿' + lines.join('\r\n') // UTF-8 BOM for Excel compatibility
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

// ── Calculation helpers ───────────────────────────────────────────────────────

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function shiftHours(start: string, end: string, breakMin: number): number {
  const s = timeToMin(start)
  let e = timeToMin(end)
  if (e < s) e += 1440
  return Math.max(0, (e - s - breakMin) / 60)
}

function presenceHours(clockIn: string, clockOut: string, breakMin: number): number {
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime()
  return Math.max(0, ms / 3600000 - breakMin / 60)
}

function fh(h: number): string {
  const sign = h < 0 ? '-' : ''
  const abs = Math.abs(h)
  const hh = Math.floor(abs)
  const mm = Math.round((abs - hh) * 60)
  return `${sign}${hh}h${mm > 0 ? mm.toString().padStart(2, '0') : ''}`
}

function contractRefHours(weeklyH: number, from: Date, to: Date): number {
  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
  return weeklyH * days / 7
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['manager', 'supervisor'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'hours_per_employee'
  const from = searchParams.get('from') ?? ''
  const to   = searchParams.get('to')   ?? ''

  if (!from || !to) return NextResponse.json({ error: 'Paramètres from/to requis' }, { status: 400 })

  const slug = `${from}_${to}`

  // ── heures travaillées par employé ──────────────────────────────────────────
  if (type === 'hours_per_employee' || type === 'overtime') {
    const [empRes, shiftRes, presRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, position, contract_type, weekly_hours').eq('role', 'employee').eq('archived', false).order('full_name'),
      supabase.from('shifts').select('employee_id, start_time, end_time, break_minutes').gte('date', from).lte('date', to).is('deleted_at', null),
      supabase.from('presences').select('employee_id, clock_in, clock_out, break_minutes_used').gte('date', from).lte('date', to),
    ])

    const employees = empRes.data ?? []
    const shifts    = shiftRes.data ?? []
    const presences = presRes.data ?? []
    const fromDate  = new Date(from)
    const toDate    = new Date(to)

    if (type === 'hours_per_employee') {
      const headers = ['Employé', 'Email', 'Poste', 'Type contrat', 'H./semaine', 'H. planifiées', 'H. réelles', 'H. contrat (période)', 'Écart contrat']
      const rows = employees.map(emp => {
        const empShifts    = shifts.filter(s => s.employee_id === emp.id)
        const empPresences = presences.filter(p => p.employee_id === emp.id)
        const planned      = empShifts.reduce((s, sh) => s + shiftHours(sh.start_time, sh.end_time, sh.break_minutes), 0)
        const real         = empPresences.reduce((s, p) => p.clock_in && p.clock_out ? s + presenceHours(p.clock_in, p.clock_out, p.break_minutes_used) : s, 0)
        const refH         = emp.weekly_hours ? contractRefHours(emp.weekly_hours, fromDate, toDate) : 0
        return [
          emp.full_name ?? emp.email,
          emp.email,
          emp.position ?? '',
          emp.contract_type ?? '',
          emp.weekly_hours ?? '',
          fh(planned),
          real > 0 ? fh(real) : '',
          refH > 0 ? fh(refH) : '',
          refH > 0 ? fh(planned - refH) : '',
        ]
      })
      return csvResponse(toCsv(headers, rows), `heures_employes_${slug}.csv`)
    }

    // overtime
    const headers = ['Employé', 'Email', 'Poste', 'H. contrat (période)', 'H. planifiées', 'Heures sup.', 'Statut']
    const rows = employees
      .filter(emp => emp.weekly_hours)
      .map(emp => {
        const empShifts = shifts.filter(s => s.employee_id === emp.id)
        const planned   = empShifts.reduce((s, sh) => s + shiftHours(sh.start_time, sh.end_time, sh.break_minutes), 0)
        const refH      = contractRefHours(emp.weekly_hours!, fromDate, toDate)
        const diff      = planned - refH
        return [
          emp.full_name ?? emp.email,
          emp.email,
          emp.position ?? '',
          fh(refH),
          fh(planned),
          fh(Math.abs(diff)),
          diff > 0.1 ? 'Surplus' : diff < -0.1 ? 'Déficit' : 'Équilibré',
        ]
      })
    return csvResponse(toCsv(headers, rows), `heures_supplementaires_${slug}.csv`)
  }

  // ── retards ─────────────────────────────────────────────────────────────────
  if (type === 'late') {
    const { data } = await supabase
      .from('lateness_records')
      .select('date, scheduled_time, actual_time, late_minutes, justified, notes, profiles:employee_id(full_name, email, position)')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })

    const headers = ['Employé', 'Email', 'Poste', 'Date', 'Heure planifiée', 'Arrivée réelle', 'Retard (min)', 'Justifié', 'Notes']
    const rows = (data ?? []).map(r => {
      const p = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles) as { full_name: string | null; email: string | null; position: string | null } | null
      return [
        p?.full_name ?? p?.email ?? '',
        p?.email ?? '',
        p?.position ?? '',
        new Date(r.date).toLocaleDateString('fr-FR'),
        r.scheduled_time.slice(0, 5),
        new Date(r.actual_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        r.late_minutes,
        r.justified ? 'Oui' : 'Non',
        r.notes ?? '',
      ]
    })
    return csvResponse(toCsv(headers, rows), `retards_${slug}.csv`)
  }

  // ── absences (congés approuvés) ──────────────────────────────────────────────
  if (type === 'absences') {
    const TYPE_LABELS: Record<string, string> = {
      CP: 'Congés payés', RTT: 'RTT', maladie: 'Maladie',
      sans_solde: 'Sans solde', autre: 'Autre',
    }
    const { data } = await supabase
      .from('leave_requests')
      .select('type, start_date, end_date, status, profiles:employee_id(full_name, email)')
      .lte('start_date', to)
      .gte('end_date', from)
      .order('start_date', { ascending: true })

    const headers = ['Employé', 'Email', 'Type', 'Date début', 'Date fin', 'Statut']
    const rows = (data ?? []).map(r => {
      const p = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles) as { full_name: string | null; email: string | null } | null
      const statusLabel: Record<string, string> = { approved: 'Approuvé', pending: 'En attente', rejected: 'Refusé' }
      return [
        p?.full_name ?? p?.email ?? '',
        p?.email ?? '',
        TYPE_LABELS[r.type] ?? r.type,
        new Date(r.start_date).toLocaleDateString('fr-FR'),
        new Date(r.end_date).toLocaleDateString('fr-FR'),
        statusLabel[r.status] ?? r.status,
      ]
    })
    return csvResponse(toCsv(headers, rows), `absences_${slug}.csv`)
  }

  return NextResponse.json({ error: 'Type de rapport inconnu' }, { status: 400 })
}
