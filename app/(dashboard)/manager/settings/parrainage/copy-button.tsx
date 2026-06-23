'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all"
      style={{
        background: copied ? 'var(--success-light, #D1FAE5)' : 'var(--accent-light)',
        color: copied ? '#065F46' : 'var(--accent)',
        border: `1px solid ${copied ? '#6EE7B7' : 'var(--accent)'}`,
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copié !' : label}
    </button>
  )
}
