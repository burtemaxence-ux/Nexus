'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink, Loader2 } from 'lucide-react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[12px] text-[var(--text-secondary)] hover:bg-[var(--accent-light)] transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copié !' : 'Copier'}
    </button>
  )
}

interface Props {
  generating: boolean
  emailSubject: string
  emailBody: string
  onChangeSubject: (v: string) => void
  onChangeBody: (v: string) => void
  onOpenMailto: () => void
  onShare: () => void
}

export function ComplianceEmailView({ generating, emailSubject, emailBody, onChangeSubject, onChangeBody, onOpenMailto, onShare }: Props) {
  if (generating) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      <p className="text-[13px] text-[var(--text-secondary)]">Génération de l&apos;email en cours…</p>
    </div>
  )

  return (
    <div className="p-5 space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Objet</label>
          <input
            value={emailSubject}
            onChange={e => onChangeSubject(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[13px] text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Corps</label>
          <textarea
            value={emailBody}
            onChange={e => onChangeBody(e.target.value)}
            rows={10}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[13px] text-[var(--text-primary)] px-3 py-2 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <CopyButton text={`${emailSubject}\n\n${emailBody}`} />
        <button
          onClick={onOpenMailto}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[12px] text-[var(--text-secondary)] hover:bg-[var(--accent-light)] transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ouvrir dans ma messagerie
        </button>
        {'share' in navigator && (
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[12px] text-[var(--text-secondary)] hover:bg-[var(--accent-light)] transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Partager
          </button>
        )}
      </div>
    </div>
  )
}
