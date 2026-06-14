'use client'

import { toast } from 'sonner'
import { Check, X, Clock } from 'lucide-react'
import leavesData from '@/data/leaves.json'

function demoAction() {
  toast.info('🎭 Mode démo — cette action n\'est pas disponible')
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,212,170,0.12)', color: 'var(--success)' }}>
      <Check className="h-3 w-3" /> Validé
    </span>
  )
  if (status === 'refused') return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,107,107,0.12)', color: 'var(--danger)' }}>
      <X className="h-3 w-3" /> Refusé
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,179,71,0.12)', color: 'var(--warning)' }}>
      <Clock className="h-3 w-3" /> En attente
    </span>
  )
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

export default function ManagerCongesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-medium tracking-[-0.02em]" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>Congés</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>Demandes d&apos;absence de votre équipe</p>
        </div>
      </div>

      <div className="space-y-3">
        {leavesData.map(req => (
          <div
            key={req.id}
            className="rounded-[14px] p-4"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-light)' }}>
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--accent)' }}>{req.initials}</span>
                </div>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{req.employee}</p>
                  <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    {formatDate(req.startDate)}{req.startDate !== req.endDate && ` → ${formatDate(req.endDate)}`} · {req.days}j · {req.typeLabel}
                  </p>
                  {req.comment && <p className="text-[12px] mt-0.5 italic" style={{ color: 'var(--text-tertiary)' }}>{req.comment}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={req.status} />
                {req.status === 'pending' && (
                  <>
                    <button onClick={demoAction} title="Fonctionnalité démo" className="btn-secondary text-[12px] cursor-not-allowed opacity-60 py-1 px-2">
                      <X className="h-3 w-3" /> Refuser
                    </button>
                    <button onClick={demoAction} title="Fonctionnalité démo" className="btn-primary text-[12px] cursor-not-allowed opacity-70 py-1 px-2">
                      <Check className="h-3 w-3" /> Valider
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
