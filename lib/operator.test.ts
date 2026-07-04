import { describe, it, expect, afterEach } from 'vitest'
import { isOperator } from './operator'

describe('isOperator', () => {
  const original = process.env.OPERATOR_EMAILS
  afterEach(() => {
    if (original === undefined) delete process.env.OPERATOR_EMAILS
    else process.env.OPERATOR_EMAILS = original
  })

  it('refuse tout le monde quand la liste est absente ou vide (fail-closed)', () => {
    delete process.env.OPERATOR_EMAILS
    expect(isOperator('maxence.burte@gmail.com')).toBe(false)
    process.env.OPERATOR_EMAILS = ''
    expect(isOperator('maxence.burte@gmail.com')).toBe(false)
  })

  it('autorise uniquement les emails listés', () => {
    process.env.OPERATOR_EMAILS = 'maxence.burte@gmail.com'
    expect(isOperator('maxence.burte@gmail.com')).toBe(true)
    expect(isOperator('intrus@gmail.com')).toBe(false)
  })

  it('est insensible à la casse et aux espaces, et gère une liste multiple', () => {
    process.env.OPERATOR_EMAILS = ' Maxence.Burte@Gmail.com , equipe@quartzbase.fr '
    expect(isOperator('maxence.burte@gmail.com')).toBe(true)
    expect(isOperator('  MAXENCE.BURTE@GMAIL.COM ')).toBe(true)
    expect(isOperator('equipe@quartzbase.fr')).toBe(true)
    expect(isOperator('autre@x.fr')).toBe(false)
  })

  it('refuse null, undefined et chaîne vide', () => {
    process.env.OPERATOR_EMAILS = 'maxence.burte@gmail.com'
    expect(isOperator(null)).toBe(false)
    expect(isOperator(undefined)).toBe(false)
    expect(isOperator('')).toBe(false)
  })
})
