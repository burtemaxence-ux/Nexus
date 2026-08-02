import { describe, it, expect } from 'vitest'
import { checkCompliance, type ShiftRecord, type ComplianceConfig } from './rules'

// Le planning de démonstration ne déclenchait qu'UNE règle sur les 17 —
// le dépassement d'heures contractuelles — parce qu'il était irréprochable
// partout ailleurs. L'écran Conformité, présenté comme le cœur du produit, se
// résumait donc à la même ligne répétée pour six salariés.
//
// La migration 091 y introduit trois situations ordinaires d'une fin de semaine
// chargée. Ce fichier vérifie qu'elles déclenchent bien les règles visées : si
// un seuil du moteur bouge, le scénario de démonstration cesse de démontrer, et
// il vaut mieux l'apprendre ici qu'en ouvrant la démo devant un acquéreur.
//
// Configuration réelle de l'établissement : boulangerie (IDCC 3061), où les
// alertes « travail de nuit » et « travail le dimanche » sont désactivées à
// juste titre — le fournil commence à 4 h et la boutique ouvre le dimanche.
const BOULANGERIE: ComplianceConfig = { night_work: false, sunday_work: false }

// Semaine ISO du 2026-06-15 : lundi 15 … vendredi 19, samedi 20.
const VEN = '2026-06-19'
const SAM = '2026-06-20'

function shift(
  employeeId: string, date: string, startTime: string, endTime: string, breakMinutes: number,
): ShiftRecord {
  return { id: `${employeeId}-${date}`, employeeId, date, startTime, endTime, breakMinutes }
}

function rulesFor(shifts: ShiftRecord[]): string[] {
  return checkCompliance(shifts, undefined, BOULANGERIE).map(v => v.ruleId)
}

describe('planning de démonstration — les infractions voulues se déclenchent', () => {
  it('repos quotidien : ferme le vendredi à 20 h, rouvre le samedi à 6 h', () => {
    const rules = rulesFor([
      shift('francois', VEN, '12:00', '20:00', 30),
      shift('francois', SAM, '06:00', '14:00', 30),
    ])

    // 10 h entre les deux services, au lieu des 11 h légales.
    expect(rules).toContain('rest_daily')
  })

  it('durée quotidienne : le responsable reste jusqu’à 19 h', () => {
    // 07:00 → 19:00 avec 1 h de pause = 11 h de travail effectif, au-dessus des 10 h.
    const rules = rulesFor([shift('hugo', VEN, '07:00', '19:00', 60)])

    expect(rules).toContain('hours_daily_max')
  })

  it('pause manquante : sept heures d’affilée sans pause', () => {
    // 7 h de travail effectif et 0 min de pause, là où 20 min sont dues dès 6 h.
    const rules = rulesFor([shift('camille', VEN, '06:00', '13:00', 0)])

    expect(rules).toContain('break_missing')
  })

  it('les journées inchangées restent conformes', () => {
    // Garde-fou : le reste du planning ne doit pas se mettre à alerter par
    // effet de bord. Un service de vente ordinaire, et un fournil de nuit —
    // que la convention boulangerie couvre — ne remontent rien.
    expect(rulesFor([shift('elise', VEN, '08:00', '16:00', 30)])).toEqual([])
    expect(rulesFor([shift('alice', VEN, '04:00', '12:00', 30)])).toEqual([])
  })
})
