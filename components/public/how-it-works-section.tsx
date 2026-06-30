import { Reveal } from '@/components/public/reveal'

const FONT = 'var(--font-manrope), sans-serif'

const STEPS = [
  { num: '1', ring: '#6C63FF', delay: '0.1s',  pulseDelay: '0s',   title: 'Ajoutez votre équipe',       body: 'Importez vos salariés et leurs contrats en quelques minutes.' },
  { num: '2', ring: '#8b86ff', delay: '0.32s', pulseDelay: '0.5s', title: 'Générez le planning',        body: "L'IA propose un planning équilibré et conforme. Vous ajustez." },
  { num: '3', ring: '#00D4AA', delay: '0.54s', pulseDelay: '1s',   title: 'Votre équipe est prévenue',  body: 'Chacun reçoit son planning sur son téléphone, automatiquement.' },
]

export function HowItWorksSection() {
  return (
    <section style={{ position: 'relative', zIndex: 2, maxWidth: 1100, margin: '110px auto 0', padding: '0 32px', fontFamily: FONT }}>
      <Reveal style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 50px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#00D4AA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
          Simple
        </div>
        <h2 style={{ fontWeight: 700, fontSize: 40, letterSpacing: '-0.025em', lineHeight: 1.12, margin: '0 0 16px' }}>
          Opérationnel en 3 étapes
        </h2>
        <p style={{ fontSize: 17, color: '#a6a8b8', lineHeight: 1.6, margin: 0 }}>
          Pas de formation, pas de paperasse. Vous démarrez aujourd&apos;hui.
        </p>
      </Reveal>

      <Reveal className="qb-steps-grid" style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
        {/* Ligne de liaison */}
        <div className="qb-steps-line" style={{ position: 'absolute', top: 27, left: '16%', right: '16%', height: 2, background: 'rgba(255,255,255,0.07)', overflow: 'visible' }}>
          <span className="qb-line" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#6C63FF,#00D4AA)', borderRadius: 2 }} />
          <span className="qb-dot" style={{ position: 'absolute', top: '50%', width: 9, height: 9, borderRadius: '50%', background: '#fff', boxShadow: '0 0 12px 3px rgba(0,212,170,0.7)', transform: 'translate(-50%,-50%)' }} />
        </div>

        {STEPS.map((step) => (
          <div key={step.num} className="qb-step" style={{ position: 'relative', textAlign: 'center', padding: '0 22px', transitionDelay: step.delay }}>
            <div className="qb-ring" style={{ width: 56, height: 56, borderRadius: '50%', background: '#0b0b12', border: `2px solid ${step.ring}`, color: step.ring, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, margin: '0 auto 22px', position: 'relative', zIndex: 1, animationDelay: step.pulseDelay }}>
              {step.num}
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 9 }}>{step.title}</div>
            <div style={{ fontSize: 14.5, color: '#a6a8b8', lineHeight: 1.6, maxWidth: 240, margin: '0 auto' }}>{step.body}</div>
          </div>
        ))}
      </Reveal>

      <style>{`
        @keyframes qbRingPulse { 0%{box-shadow:0 0 0 0 rgba(108,99,255,0.45)} 70%,100%{box-shadow:0 0 0 14px rgba(108,99,255,0)} }
        @keyframes qbDotTravel { 0%{left:0;opacity:0} 8%{opacity:1} 92%{opacity:1} 100%{left:100%;opacity:0} }
        .qb-ring { animation: qbRingPulse 2.6s ease-out infinite; }
        .qb-dot  { animation: qbDotTravel 3.4s cubic-bezier(.65,0,.35,1) infinite; animation-delay: 0.9s; }
        @media (prefers-reduced-motion: reduce) {
          .qb-ring, .qb-dot { animation: none; }
        }
        @media (max-width: 767px) {
          .qb-steps-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .qb-steps-line { display: none !important; }
        }
      `}</style>
    </section>
  )
}
