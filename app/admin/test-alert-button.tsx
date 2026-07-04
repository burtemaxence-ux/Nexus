'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

// Déclenche une alerte de test pour vérifier que le canal (Slack/email) marche.
export function TestAlertButton() {
  const [sending, setSending] = useState(false)

  async function trigger() {
    setSending(true)
    try {
      const res = await fetch('/api/admin/test-alert', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Échec')
      const channels: string[] = data.channels ?? []
      toast.success(
        channels.length
          ? `Alerte envoyée via ${channels.join(' + ')}. Vérifiez votre réception.`
          : 'Aucun canal configuré (Slack/email). Voir docs/COMMAND_CENTER.md.'
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec')
    } finally {
      setSending(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={trigger} disabled={sending}>
      <Bell className="h-4 w-4" />
      {sending ? 'Envoi…' : 'Tester une alerte'}
    </Button>
  )
}
