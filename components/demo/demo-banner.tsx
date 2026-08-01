'use client'

import { useState } from 'react'
import { Eye, ArrowLeftRight, HelpCircle, X } from 'lucide-react'

interface DemoBannerProps {
  role: 'manager' | 'employee' | 'supervisor'
}

// Bandeau visible uniquement sur les comptes de démonstration. Monté dans
// app-shell, seul point commun aux deux espaces : le bandeau est donc
// rigoureusement identique côté manager et côté employé.
export function DemoBanner({ role }: DemoBannerProps) {
  const [hidden, setHidden] = useState(false)
  if (hidden) return null

  const isEmployee = role === 'employee'
  const otherRole = isEmployee ? 'manager' : 'employee'
  const otherLabel = isEmployee ? 'Voir en manager' : 'Voir en employé'

  function replayTutorial() {
    localStorage.removeItem('qb-demo-tour-done:manager')
    localStorage.removeItem('qb-demo-tour-done:employee')
    window.location.reload()
  }

  return (
    <div
      role="status"
      style={{
        position: 'fixed', left: 16, zIndex: 60,
        // La barre de navigation du bas (mobile) occupe ~60 px : le bandeau se
        // pose au-dessus plutôt que de la recouvrir. Même valeur sur grand
        // écran, où elle reste cohérente avec les autres éléments flottants —
        // un style inline ne peut pas être surchargé par une classe.
        bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px', borderRadius: 12,
        background: 'var(--bg-card)',
        border: '1px solid var(--accent)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
        maxWidth: 'calc(100vw - 32px)', flexWrap: 'wrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
        <Eye size={14} strokeWidth={2.4} />
        Démo · {isEmployee ? 'Employé' : 'Manager'}
      </span>

      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
        Données fictives — modifiez librement
      </span>

      <a
        href={`/demo?role=${otherRole}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 9, fontSize: 12, fontWeight: 600,
          background: 'var(--accent)', color: '#fff', textDecoration: 'none',
        }}
      >
        <ArrowLeftRight size={13} strokeWidth={2.4} />
        {otherLabel}
      </a>

      <button
        onClick={replayTutorial}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 9, fontSize: 12, fontWeight: 600,
          background: 'transparent', color: 'var(--text-secondary)',
          border: '1px solid var(--border)', cursor: 'pointer',
        }}
      >
        <HelpCircle size={13} strokeWidth={2.4} />
        Revoir le tutoriel
      </button>

      <button
        onClick={() => setHidden(true)}
        aria-label="Masquer le bandeau de démonstration"
        style={{
          display: 'inline-flex', padding: 4, borderRadius: 7,
          background: 'transparent', border: 'none',
          color: 'var(--text-secondary)', cursor: 'pointer',
        }}
      >
        <X size={14} strokeWidth={2.4} />
      </button>
    </div>
  )
}
