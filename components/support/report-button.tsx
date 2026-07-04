'use client'

import { useState } from 'react'
import { LifeBuoy, Send } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

// Bouton flottant présent sur toutes les pages connectées.
// Capture automatiquement l'URL et le navigateur pour aider au diagnostic.
export function ReportButton() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    if (message.trim().length < 5) {
      toast.error('Merci de décrire le problème en quelques mots.')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          url: typeof window !== 'undefined' ? window.location.href : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Envoi impossible')
      }
      toast.success('Merci ! Votre signalement a bien été envoyé.')
      setMessage('')
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Envoi impossible')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="Signaler un problème"
          title="Signaler un problème"
          className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 sm:bottom-6 sm:right-6"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          <LifeBuoy className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signaler un problème</DialogTitle>
          <DialogDescription>
            Décrivez ce qui ne va pas. La page où vous vous trouvez est envoyée automatiquement pour un diagnostic plus rapide.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Ex : impossible de publier le planning de la semaine, un message rouge apparaît…"
          rows={5}
          maxLength={2000}
          autoFocus
        />
        <DialogFooter>
          <Button onClick={submit} disabled={sending}>
            <Send className="h-4 w-4" />
            {sending ? 'Envoi…' : 'Envoyer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
