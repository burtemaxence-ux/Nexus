// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { ProductTour, type TourStep } from './product-tour'

// La visite est montée dans app-shell : elle survit aux changements de page et
// c'est `pathname` qui lui apprend qu'une navigation a abouti.
// `push` n'avance pas `pathname` : une vraie navigation n'est pas instantanée,
// et c'est justement cet intervalle que le composant doit savoir attendre. Le
// test le referme lui-même, en posant le nouveau chemin puis en re-rendant.
let pathname = '/employee'
const push = vi.fn()
// Identité stable, comme le vrai `useRouter` : l'objet est une dépendance de
// l'effet qui joue l'étape, un nouvel objet à chaque rendu le relancerait sans fin.
const router = { push }

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => router,
}))

const STEPS: TourStep[] = [
  { title: 'L’autre moitié du produit', body: 'Intro sans navigation.' },
  { route: '/employee/planning', title: 'Ses horaires', body: 'La page planning.' },
]

const card = () => document.querySelector('[data-tour-card]') as HTMLElement

beforeEach(() => {
  pathname = '/employee'
  push.mockClear()
})

afterEach(() => cleanup())

describe('ProductTour — étapes qui changent de page', () => {
  it('attend l’arrivée de la page avant de montrer la bulle', async () => {
    const { rerender } = render(
      <ProductTour steps={STEPS} onClose={() => {}} onFinish={() => {}} />,
    )

    // Étape 1 : pas de route, la bulle se montre tout de suite.
    await waitFor(() => expect(card().style.opacity).toBe('1'))

    fireEvent.click(screen.getByText('Suivant'))

    // Laisser tourner la boucle d'événements : c'est là que l'ancienne version
    // révélait la bulle, sans attendre la page.
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })

    // La navigation est demandée, mais la bulle reste masquée : elle décrirait
    // un écran encore invisible, et réapparaîtrait en clignotant.
    expect(push).toHaveBeenCalledWith('/employee/planning')
    expect(card().style.opacity).toBe('0')

    // La page arrive → l'étape se joue.
    pathname = '/employee/planning'
    rerender(<ProductTour steps={STEPS} onClose={() => {}} onFinish={() => {}} />)
    await waitFor(() => expect(card().style.opacity).toBe('1'))
    expect(screen.getByText('Ses horaires')).toBeDefined()
  })

  it('ne navigue pas quand la page est déjà la bonne', async () => {
    pathname = '/employee/planning'
    render(<ProductTour steps={[STEPS[1]]} onClose={() => {}} onFinish={() => {}} />)

    await waitFor(() => expect(card().style.opacity).toBe('1'))
    expect(push).not.toHaveBeenCalled()
  })

  // Régression : `/manager/settings` n'est pas une page, c'est un redirect vers
  // `/manager/settings/organisation`. `pathname` n'atteint donc JAMAIS la route
  // demandée — et re-pousser à chaque rendu enfermait la visite dans une boucle
  // de navigation, qui finissait en exception client et écran noir.
  it('ne boucle pas quand la route demandée redirige ailleurs', async () => {
    pathname = '/manager'
    const steps: TourStep[] = [
      { route: '/manager/settings', title: 'Le paramétrage', body: 'Une route qui redirige.' },
    ]

    const { rerender } = render(
      <ProductTour steps={steps} onClose={() => {}} onFinish={() => {}} />,
    )
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
    expect(push).toHaveBeenCalledTimes(1)

    // La redirection dépose le visiteur ailleurs que sur la route demandée.
    pathname = '/manager/settings/organisation'
    rerender(<ProductTour steps={steps} onClose={() => {}} onFinish={() => {}} />)
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })

    // Une seule demande de navigation, et l'étape se joue sur la page d'arrivée.
    expect(push).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(card().style.opacity).toBe('1'))
  })
})
