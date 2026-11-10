// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CorrectionDialog } from './correction-dialog'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('régularise un service de nuit oublié depuis le formulaire manager', async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(Response.json([]))
    .mockResolvedValueOnce(Response.json({ ok: true }))
  vi.stubGlobal('fetch', fetcher)
  const close = vi.fn()

  render(<CorrectionDialog
    employeeId="employee-1"
    employeeName="Camille"
    date="2026-10-20"
    presence={null}
    onClose={close}
  />)

  await screen.findByText('Aucune correction enregistrée.')
  fireEvent.change(screen.getByLabelText('Arrivée réelle'), { target: { value: '2026-10-20T22:00' } })
  fireEvent.change(screen.getByLabelText('Départ réel'), { target: { value: '2026-10-21T06:00' } })
  fireEvent.change(screen.getByLabelText('Motif de la correction'), { target: { value: 'Pointage oublié' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la correction' }))

  await waitFor(() => expect(close).toHaveBeenCalledTimes(1))
  const [url, request] = fetcher.mock.calls[1]
  expect(url).toBe('/api/presences/correction')
  expect(JSON.parse(request.body)).toEqual({
    employeeId: 'employee-1',
    date: '2026-10-20',
    expectedUpdatedAt: null,
    clockIn: '2026-10-20T20:00:00.000Z',
    clockOut: '2026-10-21T04:00:00.000Z',
    reason: 'Pointage oublié',
  })
})
