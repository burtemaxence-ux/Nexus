'use client'

import { useEffect, useState } from 'react'
import { ProductTour } from './product-tour'
import { MANAGER_TOUR, EMPLOYEE_TOUR } from './tour-steps'

const DONE_KEY = 'qb-demo-tour-done'

/**
 * Lance la visite guidée au premier passage d'un visiteur, par rôle.
 *
 * L'état ne vit qu'en local : les comptes de démonstration sont partagés par
 * tous les visiteurs, il n'y a donc rien à écrire côté serveur — et deux
 * personnes qui ouvrent la démo en même temps ne se coupent pas la visite.
 */
export function DemoTour({ role }: { role: 'manager' | 'employee' | 'supervisor' }) {
  const isEmployee = role === 'employee'
  const key = `${DONE_KEY}:${isEmployee ? 'employee' : 'manager'}`
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Démarrage différé : laisse la page peindre et les données arriver, sinon
    // la première cible est mesurée avant d'exister.
    const t = setTimeout(() => {
      if (localStorage.getItem(key) !== 'true') setOpen(true)
    }, 900)
    return () => clearTimeout(t)
  }, [key])

  // Relance depuis le bandeau de démo, qui efface la clé puis recharge.
  if (!open) return null

  const close = () => {
    localStorage.setItem(key, 'true')
    setOpen(false)
  }

  return (
    <ProductTour
      steps={isEmployee ? EMPLOYEE_TOUR : MANAGER_TOUR}
      onClose={close}
      onFinish={close}
    />
  )
}
