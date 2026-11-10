'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { parisDate, parisShiftInstant } from '@/lib/presences/date'

type Hours = { clock_in: string | null; clock_out: string | null }
type HistoryEntry = {
  id: string
  created_at: string
  performed_by: string | null
  old_data: Hours | null
  new_data: Hours & { reason: string; actor_name: string | null }
}

const localTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
const displayTime = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short',
})

function inputValue(instant: string | null) {
  if (!instant) return ''
  const date = new Date(instant)
  return `${parisDate(date)}T${localTime.format(date)}`
}

function parseInput(value: string, original: string | null) {
  if (!value) return null
  if (original && value === inputValue(original)) return original
  const [date, time] = value.split('T')
  return parisShiftInstant(date, time)?.toISOString() ?? null
}

function formatHours(hours: Hours | null) {
  return [hours?.clock_in, hours?.clock_out]
    .map(value => value ? displayTime.format(new Date(value)) : '—')
    .join(' → ')
}

export function CorrectionDialog({ employeeId, employeeName, date, presence, onClose }: {
  employeeId: string
  employeeName: string
  date: string
  presence: (Hours & { updated_at: string }) | null
  onClose: () => void
}) {
  const [arrival, setArrival] = useState(() => inputValue(presence?.clock_in ?? null))
  const [departure, setDeparture] = useState(() => inputValue(presence?.clock_out ?? null))
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<HistoryEntry[] | null>(null)
  const [historyError, setHistoryError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ employeeId, date })
    async function loadHistory() {
      try {
        const response = await fetch(`/api/presences/correction?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error()
        setHistory(await response.json())
      } catch {
        if (!controller.signal.aborted) setHistoryError('Impossible de charger l’historique.')
      }
    }
    void loadHistory()
    return () => controller.abort()
  }, [employeeId, date])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const clockIn = parseInput(arrival, presence?.clock_in ?? null)
    const clockOut = parseInput(departure, presence?.clock_out ?? null)
    if (!clockIn || (departure && !clockOut)) {
      setError('Vérifiez les heures saisies. Certaines heures locales n’existent pas lors du changement d’heure.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/presences/correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId, date, expectedUpdatedAt: presence?.updated_at ?? null, clockIn, clockOut, reason,
        }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        setError(result?.error ?? 'Impossible d’enregistrer la correction.')
        return
      }
      onClose()
    } catch {
      setError('Impossible d’enregistrer la correction.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm'

  return (
    <Dialog open onOpenChange={open => { if (!open && !saving) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Corriger le pointage</DialogTitle>
          <DialogDescription>{employeeName} · {date.split('-').reverse().join('/')} · heure de Paris</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={saving} className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>Arrivée réelle</span>
              <input type="datetime-local" required value={arrival} onChange={e => setArrival(e.target.value)} className={inputClass} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Départ réel</span>
              <input type="datetime-local" value={departure} onChange={e => setDeparture(e.target.value)} className={inputClass} />
            </label>
            <p className="text-xs text-muted-foreground">Pour un service de nuit, sélectionnez la date réelle du départ.</p>
            <label className="block space-y-1 text-sm">
              <span>Motif de la correction</span>
              <textarea required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} className={inputClass} />
            </label>
          </fieldset>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
            <Button type="submit" disabled={saving || !reason.trim()}>Enregistrer la correction</Button>
          </DialogFooter>
        </form>
        <section className="space-y-2 border-t border-border pt-3">
          <h3 className="text-sm font-semibold">Historique des corrections</h3>
          {historyError && <p className="text-xs text-muted-foreground">{historyError}</p>}
          {!historyError && history === null && <p className="text-xs text-muted-foreground">Chargement…</p>}
          {history?.length === 0 && <p className="text-xs text-muted-foreground">Aucune correction enregistrée.</p>}
          {history?.map(entry => (
            <div key={entry.id} className="space-y-1 rounded-md border border-border p-2 text-xs">
              <p className="font-medium">{entry.new_data.actor_name || entry.performed_by || 'Compte supprimé'} · {displayTime.format(new Date(entry.created_at))}</p>
              <p>Avant : {formatHours(entry.old_data)}</p>
              <p>Après : {formatHours(entry.new_data)}</p>
              <p className="whitespace-pre-wrap break-words">{entry.new_data.reason}</p>
            </div>
          ))}
        </section>
      </DialogContent>
    </Dialog>
  )
}
