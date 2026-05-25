'use client'

import { useState } from 'react'
import { Link2, Copy, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  employee: {
    full_name: string | null
    email: string | null
  }
}

export default function ResendLinkButton({ employee }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    if (!employee.email) return
    setLoading(true)
    setError(null)
    setLink(null)

    const res = await fetch('/api/employees/resend-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: employee.email }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Erreur lors de la génération du lien')
    } else {
      setLink(data.link)
    }
    setLoading(false)
  }

  async function handleCopy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleOpen() {
    setOpen(true)
    setLink(null)
    setError(null)
    setCopied(false)
    handleGenerate()
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="hover:opacity-80"
        style={{ color: 'var(--accent)' }}
        onClick={handleOpen}
        title="Générer un nouveau lien d'accès"
      >
        <Link2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouveau lien d&apos;accès</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Partagez ce lien avec <strong>{employee.full_name ?? employee.email}</strong> pour qu&apos;il puisse définir ou réinitialiser son mot de passe.
            </p>

            {loading && (
              <div className="flex items-center gap-2 text-sm py-4 justify-center" style={{ color: 'var(--text-tertiary)' }}>
                <Loader2 className="h-4 w-4 animate-spin" />Génération en cours…
              </div>
            )}

            {error && (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
            )}

            {link && (
              <>
                <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-page)', border: '0.5px solid var(--border)' }}>
                  <p className="text-[11px] font-mono break-all leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{link}</p>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Valable 24 heures.</p>
                <Button onClick={handleCopy} className="w-full gap-2" variant={copied ? 'outline' : 'default'}>
                  {copied ? <><Check className="h-4 w-4 text-green-600" />Copié !</> : <><Copy className="h-4 w-4" />Copier le lien</>}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
