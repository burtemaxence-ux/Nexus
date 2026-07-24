// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { RoleRouteGuard } from './role-route-guard'

const mockPathname = vi.fn<() => string>()
vi.mock('next/navigation', () => ({ usePathname: () => mockPathname() }))

const reload = vi.fn()

beforeEach(() => {
  reload.mockClear()
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload },
    writable: true,
  })
})

afterEach(() => cleanup())

describe('RoleRouteGuard', () => {
  it('recharge la page quand un shell manager entoure une page /employee (session écrasée)', () => {
    mockPathname.mockReturnValue('/employee')
    render(<RoleRouteGuard role="manager" />)
    expect(reload).toHaveBeenCalled()
  })

  it('recharge aussi pour un superviseur (shell périmé) sur une page /employee', () => {
    mockPathname.mockReturnValue('/employee/planning')
    render(<RoleRouteGuard role="supervisor" />)
    expect(reload).toHaveBeenCalled()
  })

  it('ne recharge PAS un shell employé sur /manager (onboarding manager Google — éviter la boucle)', () => {
    mockPathname.mockReturnValue('/manager/planning')
    render(<RoleRouteGuard role="employee" />)
    expect(reload).not.toHaveBeenCalled()
  })

  it('ne recharge pas quand le rôle et la route sont cohérents', () => {
    mockPathname.mockReturnValue('/manager/employees/new')
    render(<RoleRouteGuard role="manager" />)

    mockPathname.mockReturnValue('/employee/conges')
    render(<RoleRouteGuard role="employee" />)

    mockPathname.mockReturnValue('/manager')
    render(<RoleRouteGuard role="supervisor" />)

    expect(reload).not.toHaveBeenCalled()
  })
})
