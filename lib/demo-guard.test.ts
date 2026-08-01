import { describe, it, expect } from 'vitest'
import { refuseDemoDeletion } from './demo-guard'
import { DEMO_ACCOUNTS } from './demo'

// Même exigence que pour la garde SMS : verrouillée dans les DEUX sens. Une
// garde trop large bloquerait un vrai client sur une action légitime, ce qui
// est pire que le mal qu'elle soigne.

describe('refus des suppressions définitives en démonstration', () => {
  it('refuse les deux comptes de démonstration', () => {
    for (const email of Object.values(DEMO_ACCOUNTS)) {
      const refus = refuseDemoDeletion(email, 'Supprimer un salarié')
      expect(refus?.status).toBe(403)
    }
  })

  it('laisse passer un vrai client, et les cas sans email', () => {
    for (const email of ['gerant@boulangerie-durand.fr', 'demo@autre-domaine.fr', null, undefined]) {
      expect(refuseDemoDeletion(email, 'Supprimer un salarié')).toBeNull()
    }
  })

  it('dit ce qui est refusé, et que le produit sait le faire', async () => {
    const refus = refuseDemoDeletion(DEMO_ACCOUNTS.manager, 'Supprimer un poste')
    const corps = await refus!.json()

    expect(corps.error).toContain('Supprimer un poste')
    expect(corps.error).toContain('active dans le produit')
    expect(corps.demo).toBe(true)
  })
})
