'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Reveal, useReveal, prefersReducedMotion } from '@/components/public/reveal'

const FONT = 'var(--font-manrope), sans-serif'

const PROBLEMS = [
  { label: 'Faire le planning', before: '2 h',      target: 2, suffix: 'min',         win: "L'IA génère la semaine, vous validez en un coup d'œil." },
  { label: 'Gérer un absent',   before: '5 appels', target: 1, suffix: 'clic',        win: 'La demande part aux dispo, vous confirmez du téléphone.' },
  { label: 'Rester en règle',   before: 'à la main', target: 7, suffix: 'règles auto', win: 'Repos, durées et pauses vérifiés à chaque planning.' },
]

function ProblemCard({ p }: { p: (typeof PROBLEMS)[number] }) {
  const { ref, shown } = useReveal()
  const [count, setCount] = useState(0)
  const [hovered, setHovered] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (!shown || started.current) return
    started.current = true
    if (prefersReducedMotion()) { setCount(p.target); return }
    const dur = 1100, t0 = performance.now()
    const tick = (now: number) => {
      const pr = Math.min(1, (now - t0) / dur)
      setCount(Math.round((1 - Math.pow(1 - pr, 3)) * p.target))
      if (pr < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [shown, p.target])

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg,#13121c,#0e0d15)',
        border: hovered ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 18,
        padding: '32px 30px',
        opacity: shown ? 1 : 0,
        transform: hovered ? 'translateY(-6px)' : (shown ? 'none' : 'translateY(26px)'),
        boxShadow: hovered ? '0 22px 50px rgba(0,0,0,0.45)' : 'none',
        transition: 'opacity .7s cubic-bezier(.2,.7,.2,1), transform .35s cubic-bezier(.2,.8,.2,1), border-color .3s ease, box-shadow .3s ease',
      }}
    >
      <div style={{ position: 'absolute', top: -40, right: -30, width: 170, height: 170, background: 'radial-gradient(circle,rgba(108,99,255,0.14),transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#79828f', marginBottom: 20 }}>
        {p.label}
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, color: '#6b6b80', marginBottom: 2 }}>Avant</div>
          <div style={{ fontWeight: 700, fontSize: 26, color: 'rgba(255,255,255,0.32)', textDecoration: 'line-through', textDecorationColor: 'rgba(255,107,107,0.5)', letterSpacing: '-0.02em' }}>
            {p.before}
          </div>
        </div>
        <span style={{ display: 'flex' }}><ArrowRight size={26} color="#6C63FF" strokeWidth={2} /></span>
        <div>
          <div style={{ fontSize: 11, color: '#7fe9cf', marginBottom: 2 }}>Avec Quartzbase</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontWeight: 700, fontSize: 40, lineHeight: 1, letterSpacing: '-0.03em', background: 'linear-gradient(135deg,#8b86ff,#00D4AA)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {count}
            </span>
            <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', color: '#00D4AA' }}>{p.suffix}</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.07)', marginBottom: 18, overflow: 'hidden' }}>
        <span style={{ position: 'absolute', inset: 0, width: shown ? '100%' : 0, borderRadius: 3, background: 'linear-gradient(90deg,#6C63FF,#00D4AA)', transition: 'width 1s cubic-bezier(.2,.7,.2,1)' }} />
      </div>

      <div style={{ position: 'relative', fontSize: 14.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>{p.win}</div>
    </div>
  )
}

export function ProblemSection() {
  return (
    <section style={{ position: 'relative', zIndex: 2, maxWidth: 1100, margin: '110px auto 0', padding: '0 32px', fontFamily: FONT }}>
      <Reveal style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 50px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#6C63FF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
          Avant / Après
        </div>
        <h2 style={{ fontWeight: 700, fontSize: 40, letterSpacing: '-0.025em', lineHeight: 1.12, margin: '0 auto', maxWidth: 540 }}>
          Ce que Quartzbase change concrètement
        </h2>
      </Reveal>

      <div className="qb-problem-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
        {PROBLEMS.map((p) => <ProblemCard key={p.label} p={p} />)}
      </div>

      <style>{`
        @media (max-width: 880px) {
          .qb-problem-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
