import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { MANAGER_TOUR, EMPLOYEE_TOUR } from './tour-steps'

// La visite guidée est le support commercial de la démonstration publique :
// elle traverse une douzaine d'écrans et met en lumière des éléments réels.
// Rien dans le typage ne relie une étape à la page qu'elle ouvre — un écran
// renommé ou une ancre retirée casse donc le parcours SANS erreur visible :
// la route mène à un 404, ou l'étape s'affiche centrée en promettant un
// élément que le visiteur ne voit pas. Ces deux vérifications ferment l'écart.

const STEPS = [...MANAGER_TOUR, ...EMPLOYEE_TOUR]

describe('visite guidée de la démonstration', () => {
  it('n’ouvre que des écrans qui existent', () => {
    const manquantes = Array.from(new Set(STEPS.map(s => s.route).filter(Boolean)))
      .filter(route => !existsSync(`app/(dashboard)${route}/page.tsx`))

    expect(manquantes).toEqual([])
  })

  it('ne met en lumière que des ancres présentes dans le code', () => {
    const ancres = Array.from(new Set(STEPS.map(s => s.selector).filter(Boolean)))
      .map(sel => (sel as string).match(/^\[data-tour="([^"]+)"\]$/)?.[1])
      .filter(Boolean) as string[]

    // Les ancres vivent dans les composants métier, hors du dossier demo.
    // `readdirSync` récursif plutôt que `globSync` : la CI tourne sur Node 20,
    // où ce dernier n'existe pas encore.
    const sources = ['app', 'components']
      .flatMap(dir => readdirSync(dir, { recursive: true, encoding: 'utf8' }).map(f => `${dir}/${f}`))
      .filter(f => f.endsWith('.tsx'))
      .map(f => readFileSync(f, 'utf8'))
      .join('\n')

    const orphelines = ancres.filter(a => !sources.includes(`data-tour="${a}"`))
    expect(orphelines).toEqual([])
  })
})
