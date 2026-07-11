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
  | 'hours_avg_weekly'
  | 'contract_hours_exceeded'
  | 'part_time_split'
  | 'minor_hours_daily'
  | 'minor_hours_weekly'
  | 'minor_night_work'
  | 'minor_rest_daily'
  | 'minor_break'

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

/**
 * Métadonnées employé optionnelles, nécessaires aux règles qui dépendent du
 * statut du salarié (mineur, temps partiel, heures contractuelles). Facultatif :
 * les règles concernées ne se déclenchent que si la métadonnée est fournie.
 */
export interface EmployeeMeta {
  id: string
  birthDate?: string | null    // YYYY-MM-DD — pour les règles mineurs
  contractType?: string | null // libellé indicatif (non utilisé pour le seuil)
  weeklyHours?: number | null   // heures contractuelles/semaine
}

export interface Violation {
  ruleId: RuleId
  employeeId: string
  date: string
  description: string
  suggestedFix?: string
}

/**
 * Active/désactive les alertes CONTEXTUELLES (ni infraction bloquante, ni
 * évitable par l'ordonnancement) selon la convention collective / les réglages
 * de l'établissement. Absent = tout activé (comportement historique). Ne
 * concerne QUE ces quatre règles ; les plafonds durs (repos, 10h/jour, 48h,
 * mineurs…) ne sont jamais désactivables.
 */
export interface ComplianceConfig {
  night_work?: boolean       // alerte « travail de nuit » (défaut on)
  sunday_work?: boolean      // alerte « travail le dimanche » (défaut on)
  part_time_split?: boolean  // alerte « coupure temps partiel » (défaut on)
  hours_avg_weekly?: boolean // alerte « moyenne 44h/12 sem. » (défaut on)
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
  hours_avg_weekly: {
    id: 'hours_avg_weekly',
    name: 'Moyenne hebdomadaire > 44h sur 12 semaines',
    description: 'Durée hebdomadaire moyenne supérieure à 44h sur 12 semaines consécutives',
    severity: 'critical',
    // Plafond 44h (droit commun) retenu — validé juridiquement.
    legalRef: 'Art. L3121-22 Code du travail',
  },
  contract_hours_exceeded: {
    id: 'contract_hours_exceeded',
    name: 'Dépassement des heures contractuelles',
    description: 'Heures planifiées sur la semaine supérieures à la durée contractuelle',
    severity: 'warning',
    legalRef: 'Contrat de travail (heures compl./suppl. — cf. L3123-8 / L3121-28)',
  },
  part_time_split: {
    id: 'part_time_split',
    name: 'Coupure temps partiel',
    description: 'Plus d\'une interruption dans la journée pour un salarié à temps partiel',
    severity: 'warning',
    // [À VÉRIFIER JURIDIQUEMENT] limites précises de coupure fixées par la CCN HCR.
    legalRef: 'Art. L3123-23 Code du travail + CCN HCR',
  },
  minor_hours_daily: {
    id: 'minor_hours_daily',
    name: 'Mineur — durée quotidienne > 8h',
    description: 'Plus de 8h de travail effectif en une journée pour un salarié mineur',
    severity: 'critical',
    legalRef: 'Art. L3162-1 Code du travail',
  },
  minor_hours_weekly: {
    id: 'minor_hours_weekly',
    name: 'Mineur — durée hebdomadaire > 35h',
    description: 'Plus de 35h de travail sur la semaine pour un salarié mineur',
    severity: 'critical',
    legalRef: 'Art. L3162-1 Code du travail',
  },
  minor_night_work: {
    id: 'minor_night_work',
    name: 'Mineur — travail de nuit interdit',
    description: 'Travail sur la plage de nuit interdite aux mineurs (22h–6h, ou 20h–6h avant 16 ans)',
    severity: 'critical',
    legalRef: 'Art. L3163-1 Code du travail',
  },
  minor_rest_daily: {
    id: 'minor_rest_daily',
    name: 'Mineur — repos quotidien insuffisant',
    description: 'Moins de 12h de repos entre deux journées (14h avant 16 ans)',
    severity: 'critical',
    legalRef: 'Art. L3164-1 Code du travail',
  },
  minor_break: {
    id: 'minor_break',
    name: 'Mineur — pause insuffisante',
    description: 'Moins de 30 min de pause pour 4h30 de travail continu (mineur)',
    severity: 'warning',
    legalRef: 'Art. L3162-3 Code du travail',
  },
}

/**
 * Nombre de règles légales vérifiées par le moteur — source unique pour le
 * branding (landing, FAQ, dashboard…). Dérivé de RULES : reste juste
 * automatiquement quand on ajoute/retire une règle.
 */
export const RULE_COUNT = Object.keys(RULES).length

/** Liste ordonnée des règles, pour l'affichage (socle légal d'abord). */
export const RULES_ORDERED: ComplianceRule[] = Object.values(RULES)

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

// Âge (en années révolues) à une date donnée.
function ageAt(birthDate: string, onDate: string): number {
  const b = new Date(birthDate + 'T00:00:00')
  const d = new Date(onDate + 'T00:00:00')
  let age = d.getFullYear() - b.getFullYear()
  const m = d.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && d.getDate() < b.getDate())) age--
  return age
}

// Minutes travaillées sur la plage de nuit interdite aux mineurs :
// [eveningStartMin, minuit) ∪ [minuit, 06:00) (le matin, y compris en overnight).
function nightMinutesFrom(startTime: string, endTime: string, eveningStartMin: number): number {
  const startMin = parseTimeMin(startTime)
  let endMin = parseTimeMin(endTime)
  if (endMin <= startMin) endMin += 1440
  const ranges = [[0, 360], [eveningStartMin, 1440], [1440, 1440 + 360]] as const
  return ranges.reduce((acc, [ns, ne]) => acc + Math.max(0, Math.min(endMin, ne) - Math.max(startMin, ns)), 0)
}

// Ajoute `weeks` semaines à un lundi ISO ('YYYY-MM-DD'), calcul en UTC pour
// rester cohérent avec les clés produites par getWeekMonday.
function addWeeksIso(mondayIso: string, weeks: number): string {
  const d = new Date(mondayIso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + weeks * 7)
  return d.toISOString().split('T')[0]
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

export function checkCompliance(shifts: ShiftRecord[], employees?: EmployeeMeta[], config?: ComplianceConfig): Violation[] {
  const violations: Violation[] = []

  // Alertes contextuelles activées sauf désactivation explicite (config?.X === false).
  const alertNight = config?.night_work !== false
  const alertSunday = config?.sunday_work !== false
  const alertPartTimeSplit = config?.part_time_split !== false
  const alertAvgWeekly = config?.hours_avg_weekly !== false

  const metaById = new Map<string, EmployeeMeta>((employees ?? []).map(e => [e.id, e]))

  // Group by employee
  const byEmployee = new Map<string, ShiftRecord[]>()
  for (const s of shifts) {
    if (!byEmployee.has(s.employeeId)) byEmployee.set(s.employeeId, [])
    byEmployee.get(s.employeeId)!.push(s)
  }

  for (const [empId, empShifts] of Array.from(byEmployee.entries())) {
    const meta = metaById.get(empId)
    const birthDate = meta?.birthDate || null
    const weeklyHours = (typeof meta?.weeklyHours === 'number' && meta.weeklyHours > 0) ? meta.weeklyHours : null
    const isPartTime = weeklyHours !== null && weeklyHours < 35
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

      // break_missing (L3121-16) : une pause d'au moins 20 min est due dès que
      // le temps de travail effectif *de la journée* dépasse 6h — pas par shift.
      // On agrège sur la journée pour couvrir les journées fractionnées
      // (ex. 4h + 4h = 8h de travail réparti sur deux créneaux < 6h chacun, que
      // l'ancienne vérification par shift laissait passer). Seuil > 6h conservé.
      const totalBreak = dayShifts.reduce((sum, s) => sum + s.breakMinutes, 0)
      if (totalNet > 360 && totalBreak < 20) {
        violations.push({
          ruleId: 'break_missing',
          employeeId: empId,
          date,
          description: `${fmtH(totalNet)} de travail effectif avec seulement ${totalBreak} min de pause (min. 20 min dès 6h)`,
          suggestedFix: 'Ajouter au moins 20 minutes de pause sur la journée',
        })
      }

      // sunday_work: getDay() === 0
      if (alertSunday && new Date(date + 'T00:00:00').getDay() === 0) {
        violations.push({
          ruleId: 'sunday_work',
          employeeId: empId,
          date,
          description: 'Shift planifié le dimanche — vérifier la dérogation applicable',
        })
      }

      // night_work: cumulate night minutes, trigger if ≥ 60 min
      const totalNight = dayShifts.reduce((sum, s) => sum + calcNightMinutes(s.startTime, s.endTime), 0)
      if (alertNight && totalNight >= 60) {
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

      // ── Temps partiel : au plus 1 coupure par jour (≤ 2 créneaux) ──────────
      if (alertPartTimeSplit && isPartTime && dayShifts.length > 2) {
        violations.push({
          ruleId: 'part_time_split',
          employeeId: empId,
          date,
          description: `${dayShifts.length} créneaux dans la journée (> 1 coupure) pour un temps partiel`,
          suggestedFix: 'Regrouper les créneaux : au plus une interruption par jour',
        })
      }

      // ── Règles mineurs (âge à la date du shift) ────────────────────────────
      if (birthDate) {
        const age = ageAt(birthDate, date)
        if (age < 18) {
          const isUnder16 = age < 16

          // minor_hours_daily : > 8h de travail effectif
          if (totalNet > 480) {
            violations.push({
              ruleId: 'minor_hours_daily',
              employeeId: empId,
              date,
              description: `${fmtH(totalNet)} de travail effectif (max 8h pour un mineur)`,
              suggestedFix: 'Réduire la journée à 8h maximum',
            })
          }

          // minor_break : 30 min de pause dès 4h30 de travail
          if (totalNet > 270 && totalBreak < 30) {
            violations.push({
              ruleId: 'minor_break',
              employeeId: empId,
              date,
              description: `${fmtH(totalNet)} de travail avec seulement ${totalBreak} min de pause (min. 30 min dès 4h30 pour un mineur)`,
              suggestedFix: 'Ajouter au moins 30 minutes de pause',
            })
          }

          // minor_night_work : plage interdite 22h–6h (20h–6h avant 16 ans)
          const eveningStart = isUnder16 ? 1200 : 1320
          const minorNight = dayShifts.reduce((sum, s) => sum + nightMinutesFrom(s.startTime, s.endTime, eveningStart), 0)
          if (minorNight > 0) {
            const windowLabel = isUnder16 ? '20h–6h' : '22h–6h'
            violations.push({
              ruleId: 'minor_night_work',
              employeeId: empId,
              date,
              description: `${fmtH(minorNight)} de travail sur la plage de nuit interdite aux mineurs (${windowLabel})`,
              suggestedFix: 'Déplacer le shift hors de la plage de nuit interdite',
            })
          }
        }
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

      // contract_hours_exceeded : heures planifiées > durée contractuelle
      if (weeklyHours !== null && totalMin > weeklyHours * 60) {
        violations.push({
          ruleId: 'contract_hours_exceeded',
          employeeId: empId,
          date: weekStart,
          description: `${fmtH(totalMin)} planifiées cette semaine (contrat ${weeklyHours}h) — heures compl./suppl. à vérifier`,
          suggestedFix: 'Vérifier les heures complémentaires/supplémentaires et les plafonds applicables',
        })
      }

      // minor_hours_weekly : > 35h/semaine pour un mineur (âge au lundi)
      if (birthDate && ageAt(birthDate, weekStart) < 18 && totalMin > 2100) { // 35h = 2100 min
        violations.push({
          ruleId: 'minor_hours_weekly',
          employeeId: empId,
          date: weekStart,
          description: `${fmtH(totalMin)} sur la semaine (max 35h pour un mineur)`,
          suggestedFix: 'Réduire les shifts de la semaine sous 35h',
        })
      }
    }

    // ── Moyenne hebdomadaire > 44h sur 12 semaines glissantes (L3121-22) ──────
    // Droit commun : 44h de moyenne sur toute période de 12 semaines
    // consécutives (plafond retenu, validé juridiquement).
    // On ne conclut que sur des fenêtres de 12 semaines
    // entièrement couvertes par les données (sinon on ne peut rien affirmer) :
    // les semaines internes sans shift comptent 0h ; les semaines hors plage
    // sont inconnues, donc on n'évalue pas de fenêtre qui déborderait.
    if (byWeek.size > 0) {
      const weekStarts = Array.from(byWeek.keys()).sort()
      const firstMonday = weekStarts[0]
      const lastMonday = weekStarts[weekStarts.length - 1]
      const spanWeeks = Math.round(
        (new Date(lastMonday + 'T00:00:00Z').getTime() - new Date(firstMonday + 'T00:00:00Z').getTime()) / (7 * 86400000)
      ) + 1
      if (spanWeeks >= 12) {
        // Série continue minutes/semaine sur toute la plage (semaines vides = 0).
        const series: { monday: string; min: number }[] = []
        for (let i = 0; i < spanWeeks; i++) {
          const key = addWeeksIso(firstMonday, i)
          series.push({ monday: key, min: byWeek.get(key) ?? 0 })
        }
        const WEEKLY_AVG_MAX = 44 * 60 // 2640 min
        // On retient la fenêtre en infraction la plus récente (la plus
        // actionnable) : une seule alerte par employé.
        let worst: { endMonday: string; avg: number } | null = null
        for (let i = 0; i + 12 <= series.length; i++) {
          const windowSum = series.slice(i, i + 12).reduce((s, w) => s + w.min, 0)
          const avg = windowSum / 12
          if (avg > WEEKLY_AVG_MAX) worst = { endMonday: series[i + 11].monday, avg }
        }
        if (alertAvgWeekly && worst) {
          violations.push({
            ruleId: 'hours_avg_weekly',
            employeeId: empId,
            date: worst.endMonday, // semaine de fin de la fenêtre
            description: `Moyenne de ${fmtH(Math.round(worst.avg))}/sem sur 12 semaines (max 44h)`,
            suggestedFix: 'Réduire les heures sur cette période de 12 semaines glissantes',
          })
        }
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

      // minor_rest_daily : repos quotidien 12h (14h avant 16 ans), entre deux
      // journées distinctes uniquement (pas les coupures intra-journée).
      if (birthDate && next.date !== curr.date) {
        const age = ageAt(birthDate, next.date)
        if (age < 18) {
          const minRest = age < 16 ? 840 : 720 // 14h / 12h
          if (gapMin >= 0 && gapMin < minRest) {
            violations.push({
              ruleId: 'minor_rest_daily',
              employeeId: empId,
              date: next.date,
              description: `Seulement ${fmtH(gapMin)} de repos entre deux journées (min. ${age < 16 ? '14h' : '12h'} pour un mineur)`,
              suggestedFix: 'Augmenter le repos quotidien entre les deux journées',
            })
          }
        }
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
