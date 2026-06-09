import Link from 'next/link'

/* Remplacer HERO_TITLE par le titre validé */
const HERO_TITLE = 'Fini les dimanches soir à galérer sur le planning.'

const HERO_SUBTITLE =
  `Générez le planning de votre équipe en 2 minutes avec l'IA. 4× moins cher que Skello, conforme Code du Travail.`

const TRUST_BADGE = '14 jours gratuits · Sans carte bleue · Conforme Code du Travail'

export function HeroSection() {
  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d0b1f 0%, #0a0a0f 55%, #0a0a0f 100%)',
        paddingTop: 64, /* hauteur navbar */
      }}
    >
      {/* Glow violet en haut à gauche */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '-10%',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '80px 24px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 64,
        alignItems: 'center',
      }} className="hero-grid">

        {/* ── Colonne texte ───────────────────────────────────── */}
        <div>
          {/* Badge de confiance */}
          <div
            className="hero-animate hero-delay-3"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(108,99,255,0.12)',
              border: '1px solid rgba(108,99,255,0.25)',
              borderRadius: 100,
              padding: '6px 14px',
              marginBottom: 28,
            }}
          >
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: 'rgba(255,255,255,0.65)',
              letterSpacing: '0.01em',
            }}>
              {TRUST_BADGE}
            </span>
          </div>

          {/* Titre */}
          <h1
            className="hero-animate hero-delay-0"
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(32px, 4.5vw, 54px)',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              marginBottom: 24,
            }}
          >
            {HERO_TITLE}
          </h1>

          {/* Sous-titre */}
          <p
            className="hero-animate hero-delay-1"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 18,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.6)',
              marginBottom: 40,
              maxWidth: 480,
            }}
          >
            {HERO_SUBTITLE}
          </p>

          {/* CTAs */}
          <div
            className="hero-animate hero-delay-2"
            style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}
          >
            <Link
              href="/register"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                color: '#fff',
                textDecoration: 'none',
                padding: '13px 28px',
                background: '#6C63FF',
                borderRadius: 10,
                display: 'inline-block',
                transition: 'background 200ms ease, transform 100ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#5a52e0')}
              onMouseLeave={e => (e.currentTarget.style.background = '#6C63FF')}
            >
              Essai gratuit — 14 jours
            </Link>
            <Link
              href="/demo"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: 'rgba(255,255,255,0.55)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'color 200ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
            >
              Voir la démo
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ── Colonne mockup SVG ───────────────────────────────── */}
        <div
          className="hero-mockup hero-animate hero-delay-1"
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          <PlanningMockup />
        </div>
      </div>

      {/* CSS animations + responsive */}
      <style>{`
        @keyframes hero-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .hero-animate {
          opacity: 0;
          animation: hero-fade-up 600ms ease-out forwards;
        }
        .hero-delay-0 { animation-delay: 0ms; }
        .hero-delay-1 { animation-delay: 150ms; }
        .hero-delay-2 { animation-delay: 300ms; }
        .hero-delay-3 { animation-delay: 450ms; }

        @media (prefers-reduced-motion: reduce) {
          .hero-animate {
            animation: none;
            opacity: 1;
          }
        }

        @media (max-width: 767px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
            text-align: center;
          }
          .hero-mockup {
            order: 2;
          }
        }
      `}</style>
    </section>
  )
}

/* ── SVG planning abstrait ─────────────────────────────────────────────── */
function PlanningMockup() {
  const days  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const rows  = [
    { name: 'Camille', shifts: [1,1,0,1,1,0,0], color: '#6C63FF' },
    { name: 'Lucas',   shifts: [0,1,1,1,0,1,0], color: '#00D4AA' },
    { name: 'Sophie',  shifts: [1,0,1,0,1,1,0], color: '#FFB347' },
    { name: 'Marc',    shifts: [1,1,1,0,0,1,1], color: '#FF6B6B' },
    { name: 'Léa',     shifts: [0,0,1,1,1,0,1], color: '#6C63FF' },
  ]

  const COL_W  = 44
  const ROW_H  = 36
  const LABEL_W = 64
  const HEAD_H  = 28
  const W = LABEL_W + days.length * COL_W + 24
  const H = HEAD_H + rows.length * ROW_H + 32

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: 20,
      maxWidth: 440,
      width: '100%',
    }}>
      {/* Barre de titre simulée */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6B6B' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFB347' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00D4AA' }} />
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
          marginLeft: 8,
        }}>Planning — Semaine 24</span>
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: 'visible' }}
        aria-hidden="true"
      >
        {/* En-têtes jours */}
        {days.map((day, i) => (
          <text
            key={day}
            x={LABEL_W + i * COL_W + COL_W / 2}
            y={18}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize={10}
            fontFamily="'DM Sans', sans-serif"
          >
            {day}
          </text>
        ))}

        {/* Lignes employés */}
        {rows.map((row, ri) => {
          const y = HEAD_H + ri * ROW_H
          return (
            <g key={row.name}>
              {/* Fond de ligne alternée */}
              {ri % 2 === 0 && (
                <rect
                  x={0}
                  y={y + 2}
                  width={W}
                  height={ROW_H - 4}
                  rx={4}
                  fill="rgba(255,255,255,0.02)"
                />
              )}
              {/* Nom employé */}
              <text
                x={LABEL_W - 8}
                y={y + ROW_H / 2 + 4}
                textAnchor="end"
                fill="rgba(255,255,255,0.45)"
                fontSize={10}
                fontFamily="'DM Sans', sans-serif"
              >
                {row.name}
              </text>
              {/* Shifts */}
              {row.shifts.map((active, di) => {
                if (!active) return null
                return (
                  <rect
                    key={di}
                    x={LABEL_W + di * COL_W + 4}
                    y={y + 6}
                    width={COL_W - 8}
                    height={ROW_H - 12}
                    rx={4}
                    fill={row.color}
                    opacity={0.85}
                  />
                )
              })}
            </g>
          )
        })}

        {/* Ligne de séparation header */}
        <line
          x1={0} y1={HEAD_H + 2}
          x2={W}  y2={HEAD_H + 2}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
      </svg>

      {/* Badge IA en bas */}
      <div style={{
        marginTop: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: 'rgba(108,99,255,0.1)',
        borderRadius: 8,
        border: '1px solid rgba(108,99,255,0.2)',
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="6" stroke="#6C63FF" strokeWidth="1.2" />
          <path d="M4.5 7l1.8 1.8L9.5 5" stroke="#6C63FF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          color: 'rgba(255,255,255,0.5)',
        }}>
          {`Planning généré par l'IA · Conforme Code du Travail`}
        </span>
      </div>
    </div>
  )
}
