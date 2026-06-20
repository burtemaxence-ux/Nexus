// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { Profile } from '@/types'
import { ShiftModal, type ModalState } from './shift-modal'

afterEach(() => cleanup())

// ── jsdom polyfills required by Radix (Dialog/Select) ──────────────────────────
beforeAll(() => {
  ;(globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView = vi.fn()
  ;(Element.prototype as any).hasPointerCapture = vi.fn()
  ;(Element.prototype as any).releasePointerCapture = vi.fn()
})

// next/navigation router is unused by our assertions but imported by the modal.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))

beforeEach(() => {
  // The modal fetches /api/settings on mount; return empty settings (defaults).
  ;(globalThis as any).fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({}) }))
})

const employee = { id: 'e1', full_name: 'Alex Martin', email: 'alex@x.fr', position: 'Serveur' } as unknown as Profile

function renderCreate(extra?: Partial<Parameters<typeof ShiftModal>[0]>) {
  const modalState: ModalState = { type: 'create', employee, date: new Date('2026-06-15T00:00:00') }
  return render(
    <ShiftModal
      modalState={modalState}
      onClose={vi.fn()}
      postes={[]}
      employees={[employee]}
      weekDates={[new Date('2026-06-15T00:00:00')]}
      shifts={[]}
      {...extra}
    />,
  )
}

describe('ShiftModal — create mode', () => {
  it('renders the create form with time fields', () => {
    renderCreate()
    expect(screen.getByText(/Ajouter un créneau/)).toBeInTheDocument()
    expect(screen.getByLabelText('Heure de début')).toBeInTheDocument()
    expect(screen.getByLabelText('Heure de fin')).toBeInTheDocument()
  })

  it('does not flag an insufficient break on the default 8h shift (auto-break applies)', async () => {
    renderCreate()
    // Default 09:00–17:00 auto-fills a 30 min break → no break_missing alert.
    await waitFor(() => {
      expect(screen.queryByText('Pause insuffisante')).not.toBeInTheDocument()
    })
  })

  it('surfaces a Code du Travail violation live when the shift exceeds 10h', async () => {
    renderCreate()
    fireEvent.change(screen.getByLabelText('Heure de fin'), { target: { value: '21:00' } })
    // 09:00–21:00 (12h) minus auto break is still > 10h net of work.
    expect(await screen.findByText('Durée quotidienne excessive')).toBeInTheDocument()
  })
})
