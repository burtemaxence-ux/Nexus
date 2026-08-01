import { describe, it, expect } from 'vitest'
import { isFictionNumber } from './sms'

// La démo est publique : publier un planning ou valider un congé depuis un
// compte de démonstration ne doit jamais déclencher de SMS. La garde repose sur
// la plage réservée à la fiction par l'ARCEP (06 39 98 00 00 – 06 39 98 99 99),
// attribuée à aucun abonné réel. Ces tests verrouillent les deux sens : rien ne
// part vers un numéro fictif, et aucun numéro réel n'est bloqué par erreur.

describe('isFictionNumber — numéros de démonstration', () => {
  it('reconnaît la plage de fiction, quelle que soit la mise en forme', () => {
    for (const n of [
      '06 39 98 11 07',
      '0639981107',
      '06.39.98.11.07',
      '06-39-98-11-07',
      '+33 6 39 98 11 07',
      '+33639981107',
    ]) {
      expect(isFictionNumber(n), n).toBe(true)
    }
  })

  it('laisse passer les numéros réels — la garde ne doit jamais bloquer un client', () => {
    for (const n of [
      '06 12 34 56 78',
      '0755443322',
      '+33 7 55 44 33 22',
      '01 42 00 00 00',
      '06 39 97 11 07', // juste sous la plage
      '06 39 99 11 07', // juste au-dessus
    ]) {
      expect(isFictionNumber(n), n).toBe(false)
    }
  })

  it('traite l’absence de numéro sans lever', () => {
    expect(isFictionNumber(null)).toBe(false)
    expect(isFictionNumber(undefined)).toBe(false)
    expect(isFictionNumber('')).toBe(false)
  })
})
