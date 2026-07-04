'use client'

import { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export interface Report {
  id: string
  created_at: string
  user_email: string | null
  user_name: string | null
  role: string | null
  url: string | null
  message: string
  status: 'new' | 'resolved'
}

export function ReportsList({ initialReports }: { initialReports: Report[] }) {
  const [reports, setReports] = useState<Report[]>(initialReports)
  const [busy, setBusy] = useState<string | null>(null)

  async function setStatus(id: string, status: 'new' | 'resolved') {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Échec')
      setReports(prev => prev.map(r => (r.id === id ? { ...r, status } : r)))
      toast.success(status === 'resolved' ? 'Marqué comme résolu.' : 'Rouvert.')
    } catch {
      toast.error('Action impossible')
    } finally {
      setBusy(null)
    }
  }

  if (reports.length === 0) {
    return (
      <p className="rounded-xl border p-6 text-center text-sm"
         style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
        Aucun signalement pour l’instant.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map(r => (
        <div
          key={r.id}
          className="rounded-xl border p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border)',
            opacity: r.status === 'resolved' ? 0.6 : 1,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {r.user_name || r.user_email || 'Utilisateur'}{' '}
                <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>
                  · {r.role ?? '—'} · {new Date(r.created_at).toLocaleString('fr-FR')}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm" style={{ color: 'var(--text-secondary)' }}>{r.message}</p>
              {r.url && (
                <p className="mt-1 truncate text-xs" style={{ color: 'var(--text-tertiary)' }}>Page : {r.url}</p>
              )}
            </div>
            <div className="shrink-0">
              {r.status === 'new' ? (
                <Button variant="outline" size="sm" disabled={busy === r.id} onClick={() => setStatus(r.id, 'resolved')}>
                  <Check className="h-4 w-4" /> Résolu
                </Button>
              ) : (
                <Button variant="ghost" size="sm" disabled={busy === r.id} onClick={() => setStatus(r.id, 'new')}>
                  <RotateCcw className="h-4 w-4" /> Rouvrir
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
