import { describe, it, expect } from 'vitest'
import { resolvePlan } from './stripe'

// Jeu de prix factices (indépendant des variables d'env).
const PRICES = {
  essential_monthly: 'price_ess_m', essential_yearly: 'price_ess_y',
  pro_monthly:       'price_pro_m', pro_yearly:       'price_pro_y',
  multisite_monthly: 'price_multi_m', multisite_yearly: 'price_multi_y',
}

describe('resolvePlan', () => {
  it('mappe chaque price ID (mensuel et annuel) sur son plan', () => {
    expect(resolvePlan('price_ess_m', PRICES)).toBe('essential')
    expect(resolvePlan('price_ess_y', PRICES)).toBe('essential')
    expect(resolvePlan('price_pro_m', PRICES)).toBe('pro')
    expect(resolvePlan('price_pro_y', PRICES)).toBe('pro')
    expect(resolvePlan('price_multi_m', PRICES)).toBe('multisite')
    expect(resolvePlan('price_multi_y', PRICES)).toBe('multisite')
  })

  it('renvoie free pour un price ID inconnu', () => {
    expect(resolvePlan('price_inconnu', PRICES)).toBe('free')
  })

  it('renvoie free pour un price ID vide — et ne matche pas un prix non configuré', () => {
    // Régression : quand les prix ne sont pas configurés (''), un price ID vide
    // ne doit PAS matcher (sinon tout tomberait sur 'essential').
    const nonConfig = {
      essential_monthly: '', essential_yearly: '', pro_monthly: '',
      pro_yearly: '', multisite_monthly: '', multisite_yearly: '',
    }
    expect(resolvePlan('', nonConfig)).toBe('free')
    expect(resolvePlan('', PRICES)).toBe('free')
  })

  it('contrat base : ne renvoie que des valeurs autorisées par subscriptions_plan_check', () => {
    // Doit rester aligné avec la migration 044. Ce test aurait attrapé le bug
    // où le code ecrivait 'essential'/'multisite' alors que la base attendait
    // 'essentiel'/'multi', faisant echouer le webhook.
    const ALLOWED = new Set(['free', 'essential', 'pro', 'multisite'])
    for (const id of ['price_ess_m', 'price_pro_y', 'price_multi_m', 'price_inconnu', '']) {
      expect(ALLOWED.has(resolvePlan(id, PRICES))).toBe(true)
    }
  })
})
