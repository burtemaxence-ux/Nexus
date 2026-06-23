// ── Types ─────────────────────────────────────────────────────────────────────

export type RuleId =
  | 'rest_daily'
  | 'hours_daily_max'
  | 'hours_weekly_max'
  | 'break_missing'
  | 'days_consecutive'
  | 'sunday_work'
  | 'night_work'
  | 'amplitude_max'
  | 'weekly_rest_missing'

export type Severity = 'critical' | 'warning' | 'info'

export interface ComplianceRule {
  id: RuleId
  name: string
  description: string
  severity: Severity
  legalRef: string
}

export interface ShiftRecord {
  id: string
  employeeId: string
  date: string       // YYYY-MM-DD
  startTime: string  // HH:MM
  endTime: string    // HH:MM
  breakMinutes: number
}

export interface Violation {
  ruleId: RuleId
  employeeId: string
  date: string
  description: string
  suggestedFix?: string
}

// ── Rule definitions ──────────────────────────────────────────────────────────

export const RULES: Record<RuleId, ComplianceRule> = {
  rest_daily: {
    id: 'rest_daily',
    name: 'Repos quotidien insuffisant',
    description: 'Moins de 11h de repos consécutives entre deux shifts',
    severity: 'critical',
    legalRef: 'Art. L3131-1 Code du travail',
  },
  hours_daily_max: {
    id: 'hours_daily_max',
    name: 'Durée quotidienne excessive',
    description: 'Plus de 10h de travail effectif en une journée',
    severity: 'critical',
    legalRef: 'Art. L3121-18 Code du travail',
  },
  hours_weekly_max: {
    id: 'hours_weekly_max',
    name: 'Durée hebdomadaire > 48h',
    description: 'Durée maximale absolue de 48h par semaine dépassée',
    severity: 'critical',
    legalRef: 'Art. L3121-20 Code du travail',
  },
  break_missing: {
    id: 'break_missing',
    name: 'Pause insuffisante',
    description: 'Moins de 20 min de pause pour un shift de plus de 6h',
    severity: 'warning',
    legalRef: 'Art. L3121-16 Code du travail',
  },
  days_consecutive: {
    id: 'days_consecutive',
    name: 'Jours consécutifs > 6',
    description: 'Plus de 6 jours de travail consécutifs sans repos',
    severity: 'critical',
    legalRef: 'Art. L3132-1 Code du travail',
  },
  sunday_work: {
    id: 'sunday_work',
    name: 'Travail le dimanche',
    description: 'Shift planifié le dimanche (vérifier dérogation applicable)',
    severity: 'info',
    legalRef: 'Art. L3132-3 Code du travail',
  },
  night_work: {
    id: 'night_work',
    name: 'Travail de nuit',
    description: 'Au moins 1h de travail entre 21h et 6h',
    severity: 'warning',
    legalRef: 'Art. L3122-2 Code du travail',
  },
  amplitude_max: {
    id: 'amplitude_max',
    name: 'Amplitude journalière excessive',
    description: 'Plus de 13h entre le début et la fin de la journée',
    severity: 'warning',
    legalRef: 'Art. L3121-1 + L3131-1 Code du travail',
  },
  weekly_rest_missing: {
    id: 'weekly_rest_missing',
    name: 'Repos hebdomadaire insuffisant',
    description: 'Pas de repos continu de 35h sur une fenêtre de 7 jours',
    severity: 'critical',
    legalRef: 'Art. L3132-2 Code du travail',
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTimeMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function shiftGrossMinutes(s: ShiftRecord): number {
  let start = parseTimeMin(s.startTime)
  let end   = parseTimeMin(s.endTime)
  if (end <= start) end += 1440
  return Math.max(0, end - start)
}

function shiftNetMinutes(s: ShiftRecord): number {
  return Math.max(0, shiftGrossMinutes(s) - s.breakMinutes)
}

function fmtH(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

function calcNightMinutes(startTime: string, endTime: string): number {
  const startMin = parseTimeMin(startTime)
  let endMin     = parseTimeMin(endTime)
  if (endMin <= startMin) endMin += 1440

  // Night = [0,360) ∪ [1260,1440) ∪ [1440,1800) (00-06 next day for overnight)
  const nightRanges = [[0, 360], [1260, 1440], [1440, 1800]] as const
  return nightRanges.reduce((acc, [ns, ne]) => {
    return acc + Math.max(0, Math.min(endMin, ne) - Math.max(startMin, ns))
  }, 0)
}

function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - dow + 1)
  return d.toISOString().split('T')[0]
}

function addMinutesToShiftEnd(date: string, endTime: string, isOvernight: boolean, minutes: number): string {
  const d = new Date(date + 'T' + endTime + ':00')
  if (isOvernight) d.setDate(d.getDate() + 1)
  d.setMinutes(d.getMinutes() + minutes)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function shiftEndAbsoluteMin(s: ShiftRecord, baseMs: number): number {
  const startMin = parseTimeMin(s.startTime)
  let endMin = parseTimeMin(s.endTime)
  if (endMin <= startMin) endMin += 1440
  return baseMs + endMin
}

// ── Compliance engine ─────────────────────────────────────────────────────────

export function checkCompliance(shifts: ShiftRecord[]): Violation[] {
  const violations: Violation[] = []

  // Group by employee
  const byEmployee = new Map<string, ShiftRecord[]>()
  for (const s of shifts) {
    if (!byEmployee.has(s.employeeId)) byEmployee.set(s.employeeId, [])
    byEmployee.get(s.employeeId)!.push(s)
  }

  for (const [empId, empShifts] of Array.from(byEmployee.entries())) {
    // Sort by date then start time
    const sorted = [...empShifts].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return parseTimeMin(a.startTime) - parseTimeMin(b.startTime)
    })

    // ── Group by date ────────────────────────────────────────────────────────
    const byDate = new Map<string, ShiftRecord[]>()
    for (const s of sorted) {
      if (!byDate.has(s.date)) byDate.set(s.date, [])
      byDate.get(s.date)!.push(s)
    }

    // ── Per-day rules ────────────────────────────────────────────────────────
    for (const [date, dayShifts] of Array.from(byDate.entries())) {
      const totalNet = dayShifts.reduce((sum, s) => sum + shiftNetMinutes(s), 0)

      // hours_daily_max: > 10h net (600 min)
      if (totalNet > 600) {
        violations.push({
          ruleId: 'hours_daily_max',
          employeeId: empId,
          date,
          description: `${fmtH(totalNet)} de travail effectif (max légal 10h)`,
          suggestedFix: 'Réduire la durée du shift ou ajouter une pause plus longue',
        })
      }

      // break_missing: gross shift > 6h (360 min) with < 20 min break
      for (const s of dayShifts) {
        const gross = shiftGrossMinutes(s)
        if (gross > 360 && s.breakMinutes < 20) {
          violations.push({
            ruleId: 'break_missing',
            employeeId: empId,
            date,
            description: `Shift de ${fmtH(gross)} avec seulement ${s.breakMinutes} min de pause (min. 20 min)`,
            suggestedFix: 'Ajouter au moins 20 minutes de pause dans ce shift',
          })
        }
      }

      // sunday_work: getDay() === 0
      if (new Date(date + 'T00:00:00').getDay() === 0) {
        violations.push({
          ruleId: 'sunday_work',
          employeeId: empId,
          date,
          description: 'Shift planifié le dimanche — vérifier la dérogation applicable',
        })
      }

      // night_work: cumulate night minutes, trigger if ≥ 60 min
      const totalNight = dayShifts.reduce((sum, s) => sum + calcNightMinutes(s.startTime, s.endTime), 0)
      if (totalNight >= 60) {
        violations.push({
          ruleId: 'night_work',
          employeeId: empId,
          date,
          description: `${fmtH(totalNight)} de travail de nuit (21h–6h)`,
          suggestedFix: 'Vérifier le statut de travailleur de nuit et les majorations applicables',
        })
      }

      // amplitude_max: > 13h entre le début et la fin de la journée.
      // Couvre aussi les split shifts (matin + soir) ; la borne 13h découle
      // arithmétiquement du repos quotidien de 11h (24h - 11h).
      const earliestStart = Math.min(...dayShifts.map(s => parseTimeMin(s.startTime)))
      let latestEnd = -Infinity
      for (const s of dayShifts) {
        const startMin = parseTimeMin(s.startTime)
        let endMin = parseTimeMin(s.endTime)
        if (endMin <= startMin) endMin += 1440  // overnight
        if (endMin > latestEnd) latestEnd = endMin
      }
      const amplitude = latestEnd - earliestStart
      if (amplitude > 780) { // 13h = 780 min
        violations.push({
          ruleId: 'amplitude_max',
          employeeId: empId,
          date,
          description: `${fmtH(amplitude)} entre le début et la fin de la journée (max conseillé 13h)`,
          suggestedFix: 'Resserrer les horaires pour préserver les 11h de repos quotidien',
        })
      }
    }

    // ── Weekly hours ─────────────────────────────────────────────────────────
    const byWeek = new Map<string, number>()
    for (const s of sorted) {
      const monday = getWeekMonday(s.date)
      byWeek.set(monday, (byWeek.get(monday) ?? 0) + shiftNetMinutes(s))
    }
    for (const [weekStart, totalMin] of Array.from(byWeek.entries())) {
      if (totalMin > 2880) { // 48h = 2880 min
        violations.push({
          ruleId: 'hours_weekly_max',
          employeeId: empId,
          date: weekStart,
          description: `${fmtH(totalMin)} sur la semaine (max absolu 48h)`,
          suggestedFix: 'Supprimer ou réduire des shifts sur cette semaine',
        })
      }
    }

    // ── Daily rest < 11h between consecutive shifts ───────────────────────────
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i]
      const next = sorted[i + 1]

      // Calculate absolute minutes from epoch for comparison
      const currDateMs = new Date(curr.date + 'T00:00:00').getTime() / 60000
      const nextDateMs = new Date(next.date + 'T00:00:00').getTime() / 60000

      const currEndAbsMin  = shiftEndAbsoluteMin(curr, currDateMs)
      const nextStartAbsMin = nextDateMs + parseTimeMin(next.startTime)

      const gapMin = nextStartAbsMin - currEndAbsMin

      // Only check if shifts are on different days or same-day with gap > 0
      if (gapMin >= 0 && gapMin < 660) {
        const isOvernight = parseTimeMin(curr.endTime) <= parseTimeMin(curr.startTime)
        const minRestEnd = addMinutesToShiftEnd(curr.date, curr.endTime, isOvernight, 660)
        violations.push({
          ruleId: 'rest_daily',
          employeeId: empId,
          date: next.date,
          description: `Seulement ${fmtH(gapMin)} de repos entre les shifts (minimum légal 11h)`,
          suggestedFix: `Déplacer le shift du ${next.date} à partir de ${minRestEnd}`,
        })
      }
    }

    // ── Weekly rest 35h continuous (L3132-2) ─────────────────────────────────
    // Construit des "runs" de shifts consécutifs où chaque gap observé est
    // < 35h (= aucun repos hebdomadaire qualifiant entre eux). Si un run
    // s'étend sur ≥ 6 jours calendaires (du premier début au dernier fin),
    // alors aucun repos de 35h ne tient dans la fenêtre roulante de 7 jours
    // qui le contient → violation. On ne s'appuie que sur des paires
    // observées dans la donnée, donc pas de faux positif aux bords.
    if (sorted.length > 0) {
      const WEEKLY_REST_MIN = 35 * 60     // 2100 min
      const RUN_THRESHOLD   = 6 * 24 * 60 // 8640 min (6 jours calendaires)

      let runStartIdx = 0
      for (let i = 1; i <= sorted.length; i++) {
        let gap = Infinity
        if (i < sorted.length) {
          const currDateMs = new Date(sorted[i - 1].date + 'T00:00:00').getTime() / 60000
          const nextDateMs = new Date(sorted[i].date     + 'T00:00:00').getTime() / 60000
          const currEndAbs  = shiftEndAbsoluteMin(sorted[i - 1], currDateMs)
          const nextStartAbs = nextDateMs + parseTimeMin(sorted[i].startTime)
          gap = nextStartAbs - currEndAbs
        }
        if (gap >= WEEKLY_REST_MIN) {
          const runFirst = sorted[runStartIdx]
          const runLast  = sorted[i - 1]
          const firstDateMs = new Date(runFirst.date + 'T00:00:00').getTime() / 60000
          const lastDateMs  = new Date(runLast.date  + 'T00:00:00').getTime() / 60000
          const runEnd   = shiftEndAbsoluteMin(runLast, lastDateMs)
          const runBegin = firstDateMs + parseTimeMin(runFirst.startTime)
          const span = runEnd - runBegin
          if (span >= RUN_THRESHOLD) {
            const days = Math.floor(span / 1440) + 1
            violations.push({
              ruleId: 'weekly_rest_missing',
              employeeId: empId,
              date: runLast.date,
              description: `${days} jours de travail sans 35h de repos consécutif`,
              suggestedFix: "Insérer un repos hebdomadaire d'au moins 35h continues (24h + 11h)",
            })
          }
          runStartIdx = i
        }
      }
    }

    // ── Consecutive days > 6 ─────────────────────────────────────────────────
    const workDates = Array.from(new Set(sorted.map(s => s.date))).sort()
    let run = 1
    let runStart = workDates[0]
    for (let i = 1; i < workDates.length; i++) {
      const prev = new Date(workDates[i - 1] + 'T00:00:00')
      const curr = new Date(workDates[i]     + 'T00:00:00')
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000)

      if (diff === 1) {
        run++
        if (run === 7) {
          // Flag the 7th day and all subsequent days in the run
          violations.push({
            ruleId: 'days_consecutive',
            employeeId: empId,
            date: workDates[i],
            description: `7ème jour consécutif de travail (max 6 jours sans repos)`,
            suggestedFix: `Insérer un jour de repos depuis le ${runStart}`,
          })
        } else if (run > 7) {
          violations.push({
            ruleId: 'days_consecutive',
            employeeId: empId,
            date: workDates[i],
            description: `${run}ème jour consécutif de travail (max 6 jours sans repos)`,
            suggestedFix: 'Insérer un jour de repos',
          })
        }
      } else {
        run = 1
        runStart = workDates[i]
      }
    }
  }

  return violations
}
