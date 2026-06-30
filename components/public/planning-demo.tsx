import { Zap, MousePointer2 } from 'lucide-react'

const FONT = 'var(--font-manrope), sans-serif'

const HERO_SHIFTS = [
  { day: 'Lundi',    label: '06:00 – 13:00 · Fournil', bg: 'linear-gradient(90deg,rgba(108,99,255,0.35),rgba(108,99,255,0.18))', delay: '0.2s'  },
  { day: 'Mardi',    label: '07:00 – 14:00 · Vente',   bg: 'linear-gradient(90deg,rgba(0,212,170,0.30),rgba(0,212,170,0.15))',   delay: '0.55s' },
  { day: 'Mercredi', label: '06:00 – 13:00 · Fournil', bg: 'linear-gradient(90deg,rgba(108,99,255,0.35),rgba(108,99,255,0.18))', delay: '0.9s'  },
  { day: 'Jeudi',    label: '14:00 – 20:00 · Vente',   bg: 'linear-gradient(90deg,rgba(0,212,170,0.30),rgba(0,212,170,0.15))',   delay: '1.25s' },
  { day: 'Vendredi', label: '06:00 – 13:00 · Fournil', bg: 'linear-gradient(90deg,rgba(108,99,255,0.35),rgba(108,99,255,0.18))', delay: '1.6s'  },
]

/** Carte hero : le planning qui se remplit tout seul. */
export function PlanningDemo() {
  return (
    <div style={{ position: 'relative', fontFamily: FONT }}>
      <div style={{
        background: '#13131c',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 18,
        padding: 22,
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Planning · Semaine 24</div>
            <div style={{ fontSize: 12, color: '#79828f', marginTop: 2 }}>Boulangerie Aubert — 6 salariés</div>
          </div>
          <span className="qb-hero-conform" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: '#00D4AA',
            background: 'rgba(0,212,170,0.12)',
            padding: '4px 10px',
            borderRadius: 7,
          }}>
            <span style={{ fontWeight: 800 }}>✓</span>Conforme
          </span>
        </div>

        {/* Barre « Générer le planning » + curseur qui clique */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(108,99,255,0.12)',
          border: '1px solid rgba(108,99,255,0.3)',
          borderRadius: 11,
          padding: '11px 14px',
          marginBottom: 16,
        }}>
          <span style={{ display: 'flex' }}><Zap size={16} color="#c8c4ff" strokeWidth={1.9} /></span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#c8c4ff' }}>Générer le planning</span>
          <span className="qb-hero-cursor" style={{ position: 'absolute', right: 14, display: 'flex' }}>
            <MousePointer2 size={17} color="#c8c4ff" strokeWidth={1.9} />
          </span>
        </div>

        {/* Lignes de créneaux qui apparaissent une par une */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {HERO_SHIFTS.map((row) => (
            <div key={row.day} className="qb-hero-row" style={{ display: 'flex', alignItems: 'center', gap: 12, animationDelay: row.delay }}>
              <div style={{ width: 62, fontSize: 12, color: '#79828f' }}>{row.day}</div>
              <div style={{ flex: 1, height: 30, borderRadius: 7, background: row.bg, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 11.5, color: '#cfcfe0' }}>
                {row.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mini-stat flottante */}
      <div className="qb-hero-float" style={{
        position: 'absolute',
        bottom: -22,
        left: -26,
        background: '#1a1a26',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 13,
        padding: '13px 16px',
        boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
      }}>
        <div style={{ fontWeight: 700, fontSize: 22, color: '#00D4AA', lineHeight: 1 }}>10 min</div>
        <div style={{ fontSize: 11.5, color: '#9090a8', marginTop: 2 }}>au lieu de 2 heures</div>
      </div>

      <style>{`
        @keyframes qbFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes qbCheckPop { 0%,40%{opacity:0;transform:scale(.6)} 55%,100%{opacity:1;transform:scale(1)} }
        @keyframes qbCursorClick { 0%,30%{transform:translate(0,0)} 38%{transform:translate(0,3px) scale(.92)} 46%,100%{transform:translate(0,0) scale(1)} }
        @keyframes qbFillRow { 0%,8%{opacity:0;transform:translateX(-10px)} 16%,92%{opacity:1;transform:none} 100%{opacity:1;transform:none} }
        .qb-hero-float   { animation: qbFloat 5s ease-in-out infinite; }
        .qb-hero-conform { animation: qbCheckPop 5s ease-in-out infinite; }
        .qb-hero-cursor  { animation: qbCursorClick 5s ease-in-out infinite; }
        .qb-hero-row     { animation: qbFillRow 5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .qb-hero-float, .qb-hero-conform, .qb-hero-cursor, .qb-hero-row { animation: none; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
