import Link from 'next/link'
import { Check } from 'lucide-react'
import { Reveal } from '@/components/public/reveal'

const FONT = 'var(--font-manrope), sans-serif'

type Cell = 'yes' | 'yesMuted' | 'dash' | string

const ROWS: { feature: string; trad: Cell; qb: Cell }[] = [
  { feature: 'Planning par glisser-déposer',          trad: 'yesMuted', qb: 'yes' },
  { feature: 'Gestion des congés & absences',         trad: 'yesMuted', qb: 'yes' },
  { feature: "Notifications mobile de l'équipe",      trad: 'yesMuted', qb: 'yes' },
  { feature: 'Badgeuse & suivi des présences',        trad: 'yesMuted', qb: 'yes' },
  { feature: 'Génération du planning par IA',         trad: 'dash',     qb: 'yes' },
  { feature: 'Conformité Code du travail vérifiée',   trad: 'dash',     qb: 'yes' },
  { feature: 'Remplacement trouvé en 1 clic',         trad: 'dash',     qb: 'yes' },
  { feature: 'Pilotage productivité (coût / CA)',     trad: 'dash',     qb: 'yes' },
  { feature: 'Prix moyen / mois',                     trad: '~200€',    qb: 'dès 49€' },
]

function CellContent({ value }: { value: Cell }) {
  if (value === 'yes') {
    return (
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,212,170,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={13} color="#00D4AA" strokeWidth={2.4} />
      </span>
    )
  }
  if (value === 'yesMuted') {
    return (
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={13} color="rgba(255,255,255,0.55)" strokeWidth={2.4} />
      </span>
    )
  }
  if (value === 'dash') {
    return <span style={{ width: 16, height: 1.5, background: 'rgba(255,255,255,0.18)', display: 'inline-block' }} />
  }
  return <span>{value}</span>
}

const COLS = { ['--qb-cols' as string]: '1fr 170px 200px', ['--qb-band' as string]: '200px' } as React.CSSProperties

export function ComparisonSection() {
  return (
    <section style={{ position: 'relative', zIndex: 2, maxWidth: 920, margin: '110px auto 0', padding: '0 32px', fontFamily: FONT }}>
      <Reveal style={{ textAlign: 'center', margin: '0 auto 48px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#9090a8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
          Pourquoi Quartzbase
        </div>
        <h2 style={{ fontWeight: 700, fontSize: 40, letterSpacing: '-0.025em', lineHeight: 1.12, margin: '0 0 14px' }}>
          La différence se voit tout de suite
        </h2>
        <p style={{ fontSize: 16, color: '#79828f', lineHeight: 1.6, margin: 0 }}>
          Jusqu&apos;à 1 812 € économisés par an, et des heures retrouvées chaque semaine.
        </p>
      </Reveal>

      <Reveal className="qb-cmp" style={{ ...COLS, position: 'relative', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden', background: '#0d0d14' }}>
        {/* Bande de mise en valeur de la colonne Quartzbase */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 'var(--qb-band)', background: 'linear-gradient(180deg,rgba(108,99,255,0.16),rgba(0,212,170,0.05))', borderLeft: '1px solid rgba(108,99,255,0.3)', pointerEvents: 'none' }} />

        {/* En-tête */}
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'var(--qb-cols)', alignItems: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#79828f', letterSpacing: '0.06em', textTransform: 'uppercase', paddingLeft: 28 }}>Fonctionnalité</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#79828f', textAlign: 'center', padding: '20px 0' }}>Une app similaire</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '18px 0' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0b0b12', background: 'linear-gradient(135deg,#8b86ff,#00D4AA)', padding: '3px 10px', borderRadius: 100 }}>Recommandé</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Quartzbase</span>
          </div>
        </div>

        {/* Lignes */}
        {ROWS.map((row, i) => (
          <div key={i} className="qb-stagger qb-trow" style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'var(--qb-cols)', borderTop: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', transitionDelay: `${i * 0.06}s` }}>
            <span style={{ fontSize: 14.5, color: i >= 4 && i < 8 ? '#f0f0f8' : '#c2c2d0', padding: '15px 0 15px 28px' }}>{row.feature}</span>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 13, color: '#6b6b80', padding: '15px 0' }}><CellContent value={row.trad} /></div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 13, fontWeight: 600, color: '#00D4AA', padding: '15px 0' }}><CellContent value={row.qb} /></div>
          </div>
        ))}

        {/* Ligne CTA */}
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'var(--qb-cols)', borderTop: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
          <div style={{ fontSize: 13.5, color: '#9090a8', padding: '0 0 0 28px' }}>Tout ça, pour le prix d&apos;un café par jour.</div>
          <div />
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 24px' }}>
            <Link href="/register" className="qb-cmp-btn" style={{ width: '100%', background: '#6C63FF', color: '#fff', border: 'none', borderRadius: 9, padding: 11, fontFamily: FONT, fontSize: 13, fontWeight: 700, boxShadow: '0 4px 16px rgba(108,99,255,0.4)', textAlign: 'center', textDecoration: 'none', transition: 'transform .18s ease, box-shadow .18s ease' }}>
              Essayer
            </Link>
          </div>
        </div>
      </Reveal>

      <style>{`
        .qb-trow { transition: background .18s ease, opacity .55s cubic-bezier(.2,.7,.2,1), transform .55s cubic-bezier(.2,.7,.2,1); }
        .qb-trow:hover { background: rgba(255,255,255,0.018); }
        .qb-cmp-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(108,99,255,0.5); }
        @media (max-width: 640px) {
          .qb-cmp { --qb-cols: 1fr 70px 96px; --qb-band: 96px; }
          .qb-cmp .qb-trow span:first-child,
          .qb-cmp > div > div:first-child { font-size: 13px; }
        }
      `}</style>
    </section>
  )
}
