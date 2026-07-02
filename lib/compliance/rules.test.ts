import { describe, it, expect } from 'vitest'
import { checkCompliance, type ShiftRecord, type RuleId } from './rules'

// ── Helpers ─────────────────────────────────────────────────────────────────────
let seq = 0
function shift(date: string, startTime: string, endTime: string, breakMinutes = 0, employeeId = 'emp-1'): ShiftRecord {
  return { id: `s${seq++}`, employeeId, date, startTime, endTime, breakMinutes }
}

function ruleIds(shifts: ShiftRecord[]): RuleId[] {
  return checkCompliance(shifts).map(v => v.ruleId)
}

// Repères de dates (semaine ISO du 2026-06-15) :
// 2026-06-14 = dimanche, 2026-06-15 = lundi … 2026-06-21 = dimanche.
const MON = '2026-06-15'
const TUE = '2026-06-16'
const SUN_PREV = '2026-06-14'

describe('checkCompliance — cas de base', () => {
  it('ne retourne aucune violation pour un tableau vide', () => {
    expect(checkCompliance([])).toEqual([])
  })

  it('ne retourne aucune violation pour un shift standard conforme (09:00–17:00, pause 30)', () => {
    // 8h brut, 7h30 net, pause suffisante, jour ouvré, pas de nuit.
    expect(checkCompliance([shift(MON, '09:00', '17:00', 30)])).toEqual([])
  })
})

describe('hours_daily_max — > 10h net/jour', () => {
  it('déclenche au-dessus de 10h net', () => {
    // 08:00–19:30 = 11h30 brut, pause 30 → 11h net > 10h.
    expect(ruleIds([shift(MON, '08:00', '19:30', 30)])).toContain('hours_daily_max')
  })

  it('ne déclenche pas pile à 10h net', () => {
    // 08:00–18:00 = 10h brut, pause 0 → 10h net (borne non dépassée).
    expect(ruleIds([shift(MON, '08:00', '18:00', 0)])).not.toContain('hours_daily_max')
  })

  it('cumule plusieurs shifts d’une même journée', () => {
    const ids = ruleIds([shift(MON, '08:00', '14:00', 0), shift(MON, '15:00', '20:30', 0)])
    expect(ids).toContain('hours_daily_max') // 6h + 5h30 = 11h30 net
  })
})

describe('break_missing — shift > 6h avec < 20 min de pause', () => {
  it('déclenche pour un shift de 7h sans pause', () => {
    expect(ruleIds([shift(MON, '09:00', '16:00', 0)])).toContain('break_missing')
  })

  it('ne déclenche pas avec 20 min de pause', () => {
    expect(ruleIds([shift(MON, '09:00', '16:00', 20)])).not.toContain('break_missing')
  })

  it('ne déclenche pas pour un shift de 6h pile sans pause', () => {
    // 09:00–15:00 = 360 min brut, la règle exige > 360.
    expect(ruleIds([shift(MON, '09:00', '15:00', 0)])).not.toContain('break_missing')
  })

  it('déclenche pour une journée fractionnée (4h + 4h) sans pause', () => {
    // 8h de travail effectif réparties sur deux créneaux < 6h chacun : chaque
    // shift pris isolément passait, mais la pause reste due (> 6h sur la journée).
    const ids = ruleIds([shift(MON, '08:00', '12:00', 0), shift(MON, '14:00', '18:00', 0)])
    expect(ids).toContain('break_missing')
  })

  it('ne déclenche pas si la pause cumulée du jour atteint 20 min', () => {
    // 4h + 4h = 8h de travail, 20 min de pause au total sur la journée → conforme.
    const ids = ruleIds([shift(MON, '08:00', '12:00', 0), shift(MON, '14:00', '18:00', 20)])
    expect(ids).not.toContain('break_missing')
  })
})

describe('hours_weekly_max — > 48h net/semaine', () => {
  it('déclenche au-delà de 48h sur la semaine', () => {
    // 6 jours × 9h net = 54h.
    const days = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20']
    expect(ruleIds(days.map(d => shift(d, '08:00', '17:00', 0)))).toContain('hours_weekly_max')
  })

  it('ne déclenche pas à 40h sur la semaine', () => {
    const days = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19']
    expect(ruleIds(days.map(d => shift(d, '09:00', '17:00', 0)))).not.toContain('hours_weekly_max')
  })
})

describe('rest_daily — < 11h de repos entre deux shifts', () => {
  it('déclenche quand le repos est inférieur à 11h', () => {
    // Fin lundi 23:00 → reprise mardi 07:00 = 8h de repos.
    expect(ruleIds([shift(MON, '15:00', '23:00', 30), shift(TUE, '07:00', '12:00', 0)]))
      .toContain('rest_daily')
  })

  it('ne déclenche pas avec 11h ou plus de repos', () => {
    // Fin lundi 18:00 → reprise mardi 08:00 = 14h de repos.
    expect(ruleIds([shift(MON, '10:00', '18:00', 30), shift(TUE, '08:00', '14:00', 30)]))
      .not.toContain('rest_daily')
  })
})

describe('days_consecutive — > 6 jours consécutifs', () => {
  it('déclenche au 7ème jour consécutif', () => {
    const days = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21']
    expect(ruleIds(days.map(d => shift(d, '10:00', '14:00', 0)))).toContain('days_consecutive')
  })

  it('ne déclenche pas à 6 jours consécutifs', () => {
    const days = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20']
    expect(ruleIds(days.map(d => shift(d, '10:00', '14:00', 0)))).not.toContain('days_consecutive')
  })
})

describe('sunday_work — shift le dimanche', () => {
  it('déclenche pour un shift planifié un dimanche', () => {
    expect(ruleIds([shift(SUN_PREV, '10:00', '14:00', 0)])).toContain('sunday_work')
  })

  it('ne déclenche pas un jour ouvré', () => {
    expect(ruleIds([shift(MON, '10:00', '14:00', 0)])).not.toContain('sunday_work')
  })
})

describe('night_work — ≥ 1h entre 21h et 6h', () => {
  it('déclenche pour un shift de nuit (22:00–23:30)', () => {
    expect(ruleIds([shift(MON, '22:00', '23:30', 0)])).toContain('night_work')
  })

  it('gère un shift à cheval sur minuit (20:00–02:00)', () => {
    // De 21:00 à 02:00 = 5h de nuit.
    expect(ruleIds([shift(MON, '20:00', '02:00', 0)])).toContain('night_work')
  })

  it('ne déclenche pas pour un shift de jour (09:00–17:00)', () => {
    expect(ruleIds([shift(MON, '09:00', '17:00', 30)])).not.toContain('night_work')
  })
})

describe('amplitude_max — > 13h entre début et fin de journée', () => {
  it('déclenche pour un split shift à 14h d’amplitude', () => {
    // 09:00–12:00 puis 18:00–23:00 → amplitude 14h.
    expect(ruleIds([shift(MON, '09:00', '12:00', 0), shift(MON, '18:00', '23:00', 0)]))
      .toContain('amplitude_max')
  })

  it('ne déclenche pas pile à 13h d’amplitude', () => {
    // 09:00–12:00 puis 18:00–22:00 → amplitude 13h pile (borne stricte).
    expect(ruleIds([shift(MON, '09:00', '12:00', 0), shift(MON, '18:00', '22:00', 0)]))
      .not.toContain('amplitude_max')
  })

  it('ne déclenche pas pour un shift unique de jour', () => {
    expect(ruleIds([shift(MON, '09:00', '17:00', 30)])).not.toContain('amplitude_max')
  })

  it('gère correctement un shift de nuit à cheval sur minuit', () => {
    // 22:00–02:00 → amplitude 4h.
    expect(ruleIds([shift(MON, '22:00', '02:00', 0)])).not.toContain('amplitude_max')
  })
})

describe('weekly_rest_missing — pas de repos 35h continu sur 7 jours', () => {
  it('déclenche sur 7 jours consécutifs avec des gaps tous < 35h', () => {
    // Lun–Dim 09:00–17:00 chaque jour → gaps de 16h, aucun repos 35h.
    const days = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21']
    expect(ruleIds(days.map(d => shift(d, '09:00', '17:00', 0))))
      .toContain('weekly_rest_missing')
  })

  it('déclenche quand le jour de repos donne moins de 35h continues', () => {
    // Lun–Sam 06:00–23:00, Dim off, Lun+Mar suivants 06:00–23:00.
    // Sam 23:00 → Lun 06:00 = 31h (< 35h) → run continue, span ≥ 6 jours.
    const shifts = [
      shift('2026-06-15', '06:00', '23:00', 30),
      shift('2026-06-16', '06:00', '23:00', 30),
      shift('2026-06-17', '06:00', '23:00', 30),
      shift('2026-06-18', '06:00', '23:00', 30),
      shift('2026-06-19', '06:00', '23:00', 30),
      shift('2026-06-20', '06:00', '23:00', 30),
      // Dimanche off
      shift('2026-06-22', '06:00', '23:00', 30),
      shift('2026-06-23', '06:00', '23:00', 30),
    ]
    expect(ruleIds(shifts)).toContain('weekly_rest_missing')
  })

  it('ne déclenche pas avec un vrai repos de 35h+ dans les données', () => {
    // Lun–Ven 09:00–17:00 puis arrêt → repos > 35h après vendredi.
    const days = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19']
    expect(ruleIds(days.map(d => shift(d, '09:00', '17:00', 0))))
      .not.toContain('weekly_rest_missing')
  })

  it('ne déclenche pas pour 6 jours suivis d’un repos suffisant', () => {
    // Lun–Sam 09:00–17:00 (span = 5j + 8h, < 6 jours).
    const days = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20']
    expect(ruleIds(days.map(d => shift(d, '09:00', '17:00', 0))))
      .not.toContain('weekly_rest_missing')
  })

  it('ne déclenche pas pour un shift isolé', () => {
    expect(ruleIds([shift(MON, '09:00', '17:00', 0)]))
      .not.toContain('weekly_rest_missing')
  })

  it('ne flague pas aux bords quand le repos sort de la fenêtre observée', () => {
    // Mar–Ven 09:00–17:00 puis plus de shift dans la donnée → on n’infère pas
    // l’absence de repos après Ven (la donnée s’arrête, pas de faux positif).
    const days = ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19']
    expect(ruleIds(days.map(d => shift(d, '09:00', '17:00', 0))))
      .not.toContain('weekly_rest_missing')
  })
})

describe('isolation par employé', () => {
  it('ne mélange pas les jours consécutifs de deux employés', () => {
    // Chaque employé ne travaille qu’un seul jour → aucun cumul de jours consécutifs.
    const shifts = [
      shift('2026-06-15', '10:00', '14:00', 0, 'emp-a'),
      shift('2026-06-16', '10:00', '14:00', 0, 'emp-b'),
    ]
    expect(ruleIds(shifts)).not.toContain('days_consecutive')
  })
})
