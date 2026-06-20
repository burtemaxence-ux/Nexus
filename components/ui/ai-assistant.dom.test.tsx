// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MarkdownText } from './ai-assistant'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))

afterEach(() => cleanup())

beforeEach(() => {
  ;(globalThis as any).fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
})

describe('MarkdownText', () => {
  it('renders markdown bold and bullet lists', () => {
    render(<MarkdownText text={'**Important**\n\n- un\n- deux'} />)
    expect(screen.getByText('Important').tagName).toBe('STRONG')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('does not inject raw HTML (no XSS)', () => {
    const { container } = render(
      <MarkdownText text={'Bonjour <img src=x onerror="alert(1)"> <script>alert(1)</script>'} />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('[onerror]')).toBeNull()
  })

  it('still renders RH document blocks as a card', () => {
    render(<MarkdownText text={'[DOC:Avertissement]\nContenu du document\n[/DOC]'} />)
    expect(screen.getByText('Avertissement')).toBeInTheDocument()
    expect(screen.getByText('Contenu du document')).toBeInTheDocument()
  })
})

describe('MarkdownText — action cards', () => {
  it('renders a confirmable action and calls the right API on confirm', async () => {
    render(<MarkdownText text={'[ACTION:approve_leave]{"id":"abc","label":"Congé de Hugo"}[/ACTION]'} />)
    const btn = screen.getByRole('button', { name: 'Valider' })
    expect(screen.getByText('Congé de Hugo')).toBeInTheDocument()

    fireEvent.click(btn)

    await waitFor(() => {
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        '/api/conges/abc',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'approved' }) }),
      )
    })
    expect(await screen.findByText('Congé validé')).toBeInTheDocument()
  })

  it('creates a draft shift via POST /api/shifts on confirm', async () => {
    render(<MarkdownText text={'[ACTION:create_shift]{"employee_id":"emp1","date":"2026-06-15","start_time":"09:00","end_time":"17:00","break_minutes":30,"label":"Hugo · 09:00-17:00"}[/ACTION]'} />)
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }))
    await waitFor(() => {
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        '/api/shifts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ employee_id: 'emp1', date: '2026-06-15', start_time: '09:00', end_time: '17:00', break_minutes: 30, poste_id: null, status: 'draft' }),
        }),
      )
    })
  })

  it('approves a shift exchange via the approve endpoint', async () => {
    render(<MarkdownText text={'[ACTION:approve_exchange]{"id":"ex1","label":"Échange Hugo"}[/ACTION]'} />)
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }))
    await waitFor(() => {
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        '/api/exchanges/ex1/approve',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  it('invites an employee via /api/employees/invite', async () => {
    render(<MarkdownText text={'[ACTION:invite_employee]{"first_name":"Jean","last_name":"Dupont","email":"jean@ex.fr","role":"employee","label":"Inviter Jean"}[/ACTION]'} />)
    fireEvent.click(screen.getByRole('button', { name: 'Inviter' }))
    await waitFor(() => {
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        '/api/employees/invite',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ first_name: 'Jean', last_name: 'Dupont', email: 'jean@ex.fr', role: 'employee' }) }),
      )
    })
  })

  it('copies a week via /api/shifts/copy-week', async () => {
    render(<MarkdownText text={'[ACTION:copy_week]{"from_monday":"2026-06-09","label":"Copier"}[/ACTION]'} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copier' }))
    await waitFor(() => {
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        '/api/shifts/copy-week',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ from_monday: '2026-06-09' }) }),
      )
    })
  })

  it('renders nothing for a create_shift missing required fields', () => {
    const { container } = render(<MarkdownText text={'[ACTION:create_shift]{"employee_id":"emp1","label":"incomplet"}[/ACTION]'} />)
    expect(container.querySelector('button')).toBeNull()
  })

  it('renders nothing for an unknown or malformed action (never executes)', () => {
    const { container } = render(<MarkdownText text={'[ACTION:drop_table]{"id":"x"}[/ACTION]'} />)
    expect(screen.queryByRole('button')).toBeNull()
    const { container: c2 } = render(<MarkdownText text={'[ACTION:approve_leave]not-json[/ACTION]'} />)
    expect(c2.querySelector('button')).toBeNull()
    expect(container).toBeTruthy()
  })
})
