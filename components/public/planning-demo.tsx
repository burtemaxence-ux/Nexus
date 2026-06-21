'use client'

import React, { useEffect, useRef, useState } from 'react'

/* Démo animée : l'IA génère un planning à partir d'une phrase.
   Boucle : frappe du prompt → réflexion → remplissage → conforme → pause. */

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']
const ROWS = [
  { name: 'Sophie',  role: 'Boulanger', hours: '6h–14h',  color: '#6C63FF', days: [1, 1, 1, 0, 1] },
  { name: 'Lucas',   role: 'Vendeur',   hours: '14h–22h', color: '#00D4AA', days: [1, 0, 1, 1, 1] },
  { name: 'Camille', role: 'Pâtissier', hours: '6h–14h',  color: '#FFB347', days: [1, 1, 0, 1, 1] },
  { name: 'Marc',    role: 'Vendeur',   hours: '10h–18h', color: '#FF8C42', days: [0, 1, 1, 1, 1] },
]

const PROMPT = 'Sophie le matin, Lucas en coupure, max 39h chacun'

// Cellules travaillées, dans l'ordre de remplissage (par employé).
const WORKED: string[] = []
ROWS.forEach((row, r) => row.days.forEach((w, d) => { if (w) WORKED.push(`${r}-${d}`) }))
const TOTAL = WORKED.length

type Phase = 'typing' | 'thinking' | 'filling' | 'done'

export function PlanningDemo() {
  const [typed, setTyped] = useState(0)
  const [revealed, setRevealed] = useState(0)
  const [phase, setPhase] = useState<Phase>('typing')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      setTyped(PROMPT.length); setRevealed(TOTAL); setPhase('done')
      return
    }

    let cancelled = false
    let running = false
    const shouldRun = { current: false }
    const timers: number[] = []
    const alive = () => shouldRun.current && !cancelled
    const wait = (ms: number) =>
      new Promise<void>((res) => { timers.push(window.setTimeout(res, ms)) })

    async function run() {
      if (running) return
      running = true
      try {
        while (alive()) {
          setPhase('typing'); setTyped(0); setRevealed(0)
          for (let i = 1; i <= PROMPT.length; i++) { if (!alive()) return; setTyped(i); await wait(42) }
          if (!alive()) return; await wait(450)
          setPhase('thinking'); await wait(1000)
          if (!alive()) return; setPhase('filling')
          for (let i = 1; i <= TOTAL; i++) { if (!alive()) return; setRevealed(i); await wait(90) }
          if (!alive()) return; setPhase('done'); await wait(3200)
        }
      } finally { running = false }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        shouldRun.current = entry.isIntersecting
        if (entry.isIntersecting) run()
      },
      { threshold: 0.25 }
    )
    if (ref.current) observer.observe(ref.current)

    return () => {
      cancelled = true
      shouldRun.current = false
      observer.disconnect()
      timers.forEach(clearTimeout)
    }
  }, [])

  const font = "'DM Sans', sans-serif"
  const isThinking = phase === 'thinking'
  const showBadge = phase === 'done'

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Démonstration : l'IA génère un planning conforme à partir d'une phrase"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 20,
        maxWidth: 460,
        width: '100%',
      }}
    >
      {/* Barre de titre simulée */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6B6B' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFB347' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00D4AA' }} />
        <span style={{ fontFamily: font, fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
          Planning · Semaine 24
        </span>
      </div>

      {/* Barre de prompt */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(108,99,255,0.08)',
        border: '1px solid rgba(108,99,255,0.25)',
        borderRadius: 10,
        padding: '10px 12px',
        marginBottom: 16,
        minHeight: 58,
      }}>
        <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>✨</span>
        <span style={{
          flex: 1,
          fontFamily: font,
          fontSize: 12.5,
          lineHeight: 1.4,
          color: 'rgba(255,255,255,0.85)',
        }}>
          {PROMPT.slice(0, typed)}
          {phase === 'typing' && <span className="demo-caret" />}
        </span>
        <span style={{
          fontFamily: font,
          fontSize: 11,
          fontWeight: 600,
          color: '#fff',
          background: '#6C63FF',
          borderRadius: 7,
          padding: '6px 12px',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {isThinking && <span className="demo-spinner" aria-hidden="true" />}
          {isThinking ? 'Génération…' : 'Générer'}
        </span>
      </div>

      {/* Grille planning */}
      <div style={{ position: 'relative' }}>
        {isThinking && <div className="demo-shimmer" aria-hidden="true" />}
        <div style={{ display: 'grid', gridTemplateColumns: '88px repeat(5, 1fr)', gap: 5 }}>
          <div />
          {DAYS.map((day) => (
            <div key={day} style={{ fontFamily: font, fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center', paddingBottom: 4 }}>
              {day}
            </div>
          ))}

          {ROWS.map((row, r) => (
            <React.Fragment key={row.name}>
              <div style={{ paddingRight: 6, alignSelf: 'center' }}>
                <div style={{ fontFamily: font, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>{row.name}</div>
                <div style={{ fontFamily: font, fontSize: 9, color: 'rgba(255,255,255,0.32)' }}>{row.role}</div>
              </div>
              {row.days.map((worked, d) => {
                if (!worked) {
                  return <div key={d} style={{ border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 6 }} />
                }
                const order = WORKED.indexOf(`${r}-${d}`)
                const shown = order < revealed
                return (
                  <div
                    key={d}
                    style={{
                      background: row.color,
                      borderRadius: 6,
                      padding: '7px 2px',
                      textAlign: 'center',
                      opacity: shown ? 0.9 : 0,
                      transform: shown ? 'scale(1)' : 'scale(0.85)',
                      transition: 'opacity 220ms ease, transform 220ms ease',
                    }}
                  >
                    <span style={{ fontFamily: font, fontSize: 8.5, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
                      {row.hours}
                    </span>
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Badge conformité */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, minHeight: 26 }}>
        <span style={{
          fontFamily: font, fontSize: 10.5, fontWeight: 600, color: '#00D4AA',
          background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)',
          borderRadius: 100, padding: '4px 12px',
          opacity: showBadge ? 1 : 0,
          transform: showBadge ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 300ms ease, transform 300ms ease',
        }}>
          ✓ Conforme Code du Travail
        </span>
      </div>

      <style>{`
        .demo-caret {
          display: inline-block;
          width: 1.5px;
          height: 13px;
          background: #6C63FF;
          margin-left: 1px;
          vertical-align: -2px;
          animation: demo-blink 1s step-end infinite;
        }
        @keyframes demo-blink { 50% { opacity: 0; } }

        .demo-spinner {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          animation: demo-spin 0.7s linear infinite;
        }
        @keyframes demo-spin { to { transform: rotate(360deg); } }

        .demo-shimmer {
          position: absolute;
          inset: 0;
          z-index: 2;
          border-radius: 8px;
          background: linear-gradient(100deg, transparent 30%, rgba(108,99,255,0.18) 50%, transparent 70%);
          background-size: 200% 100%;
          animation: demo-sweep 1.1s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes demo-sweep {
          0% { background-position: 150% 0; }
          100% { background-position: -50% 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .demo-caret, .demo-spinner, .demo-shimmer { animation: none; }
        }
      `}</style>
    </div>
  )
}
