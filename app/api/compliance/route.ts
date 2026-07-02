import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireManager } from '@/lib/api-auth'
import { checkCompliance, RULES, type Violation, type RuleId, type Severity } from '@/lib/compliance/rules'
import { NextRequest, NextResponse } from 'next/server'

// ── Public types ──────────────────────────────────────────────────────────────

export type ComplianceViolation = Violation & {
  employeeName: string
  ruleName: string
  ruleDescription: string
  severity: Severity
  legalRef: string
}

export type CompliancePayload = {
  from: string
  to: string
  totalShifts: number
  violations: ComplianceViolation[]
  bySeverity: { critical: number; warning: number; info: number }
  byRule: Partial<Record<RuleId, number>>
  employeesAffected: number
  complianceScore: number
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
  const supabase = await createClient()
  const { profile } = await requireManager(supabase)

  const establishmentId = profile.active_establishment_id ?? profile.establishment_id
  if (!establishmentId) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 400 })

  const { searchParams } = new URL(req.url)

  // Default: current week Mon → Sun
  const today = new Date()
  const defaultFrom = getWeekMonday(today.toISOString().split('T')[0])
  const defaultTo   = new Date(new Date(defaultFrom + 'T00:00:00').getTime() + 6 * 86400000)
    .toISOString().split('T')[0]

  const from = searchParams.get('from') ?? defaultFrom
  const to   = searchParams.get('to')   ?? defaultTo

  // Remonter 12 semaines (84 j) avant `from` : nécessaire à la moyenne 44h sur
  // 12 semaines glissantes (L3121-22). Couvre aussi le repos quotidien du 1er jour.
  const fetchFrom = new Date(new Date(from + 'T00:00:00').getTime() - 84 * 86400000)
    .toISOString().split('T')[0]

  const [{ data: shifts }, { data: profiles }] = await Promise.all([
    supabaseAdmin
      .from('shifts')
      .select('id, employee_id, date, start_time, end_time, break_minutes')
      .eq('establishment_id', establishmentId)
      .gte('date', fetchFrom)
      .lte('date', to)
      .is('deleted_at', null),

    supabaseAdmin
      .from('profiles')
      .select('id, full_name, birth_date, contract_type, weekly_hours')
      .eq('establishment_id', establishmentId)
      .eq('role', 'employee'),
  ])

  const nameMap = new Map((profiles ?? []).map(p => [p.id, p.full_name ?? 'Employé']))

  const employees = (profiles ?? []).map(p => ({
    id: p.id,
    birthDate: p.birth_date ?? null,
    contractType: p.contract_type ?? null,
    weeklyHours: p.weekly_hours ?? null,
  }))

  const shiftRecords = (shifts ?? []).map(s => ({
    id: s.id,
    employeeId: s.employee_id,
    date: s.date,
    startTime: s.start_time,
    endTime: s.end_time,
    breakMinutes: s.break_minutes ?? 0,
  }))

  const allViolations = checkCompliance(shiftRecords, employees)

  // Garder les violations dont la date tombe dans la plage demandée. La moyenne
  // 44h/12 sem. (hours_avg_weekly) est datée à la fin de fenêtre, potentiellement
  // hors plage : on la conserve toujours (max 1 par employé).
  const inRange = allViolations.filter(
    v => v.ruleId === 'hours_avg_weekly' || (v.date >= from && v.date <= to)
  )

  const totalShifts = (shifts ?? []).filter(s => s.date >= from && s.date <= to).length

  const enriched: ComplianceViolation[] = inRange.map(v => ({
    ...v,
    employeeName:    nameMap.get(v.employeeId) ?? v.employeeId,
    ruleName:        RULES[v.ruleId].name,
    ruleDescription: RULES[v.ruleId].description,
    severity:        RULES[v.ruleId].severity,
    legalRef:        RULES[v.ruleId].legalRef,
  }))

  const severityOrder: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }
  enriched.sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity] || a.date.localeCompare(b.date)
  )

  const bySeverity = {
    critical: enriched.filter(v => v.severity === 'critical').length,
    warning:  enriched.filter(v => v.severity === 'warning').length,
    info:     enriched.filter(v => v.severity === 'info').length,
  }

  const byRule: Partial<Record<RuleId, number>> = {}
  for (const v of enriched) {
    byRule[v.ruleId] = (byRule[v.ruleId] ?? 0) + 1
  }

  const employeesAffected = new Set(
    enriched.filter(v => v.severity !== 'info').map(v => v.employeeId)
  ).size

  // Score: start at 100, subtract for each critical (×5) and warning (×2)
  const complianceScore = Math.max(
    0,
    100 - bySeverity.critical * 5 - bySeverity.warning * 2
  )

  return NextResponse.json({
    from,
    to,
    totalShifts,
    violations: enriched,
    bySeverity,
    byRule,
    employeesAffected,
    complianceScore,
  } satisfies CompliancePayload)
  } catch (e) {
    if (e instanceof Response) return e as NextResponse
    throw e
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────

function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - dow + 1)
  return d.toISOString().split('T')[0]
}
