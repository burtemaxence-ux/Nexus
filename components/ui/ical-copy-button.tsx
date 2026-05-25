'use client'

import { useState } from 'react'
import { Calendar, Check, Copy } from 'lucide-react'

export function ICalCopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{ backgroundColor: 'var(--bg-page)', border: '0.5px solid var(--border)' }}
    >
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'var(--accent-light)' }}
      >
        <Calendar className="h-4 w-4" style={{ color: 'var(--accent)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
          Synchroniser avec mon calendrier
        </p>
        <p className="text-[11px] mt-0.5 truncate font-mono" style={{ color: 'var(--text-tertiary)' }}>
          {url}
        </p>
      </div>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 shrink-0 h-8 px-3 rounded-lg text-[12px] font-medium transition-colors duration-150"
        style={copied
          ? { backgroundColor: '#F0FDF4', border: '0.5px solid #BBF7D0', color: '#15803D' }
          : { backgroundColor: 'var(--accent-light)', border: '0.5px solid var(--accent)', color: 'var(--accent)' }
        }
      >
        {copied ? <><Check className="h-3.5 w-3.5" />Copié</> : <><Copy className="h-3.5 w-3.5" />Copier</>}
      </button>
    </div>
  )
}
