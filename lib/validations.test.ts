import { describe, it, expect } from 'vitest'
import { ShiftSchema } from './validations'

// Régression : l'auto-application du planning (IA et algorithme) envoie
// notes:null / poste_id:null / position:null. Le schéma doit les accepter,
// sinon les inserts échouent en 422 et rien n'est persisté.
describe('ShiftSchema — champs nullable', () => {
  const base = {
    employee_id: '11111111-1111-4111-8111-111111111111',
    date: '2026-06-22',
    start_time: '09:00',
    end_time: '17:00',
    break_minutes: 30,
  }

  it('accepte notes:null', () => {
    expect(ShiftSchema.safeParse({ ...base, notes: null }).success).toBe(true)
  })

  it('accepte poste_id:null', () => {
    expect(ShiftSchema.safeParse({ ...base, poste_id: null }).success).toBe(true)
  })

  it('accepte position:null', () => {
    expect(ShiftSchema.safeParse({ ...base, position: null }).success).toBe(true)
  })

  it('accepte le payload complet de l’auto-planning (null partout)', () => {
    expect(ShiftSchema.safeParse({ ...base, poste_id: null, position: null, notes: null }).success).toBe(true)
  })

  it('rejette toujours une heure mal formée', () => {
    expect(ShiftSchema.safeParse({ ...base, start_time: '9h00' }).success).toBe(false)
  })
})
