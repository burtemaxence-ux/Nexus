// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { MarkdownText } from './ai-assistant'

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
