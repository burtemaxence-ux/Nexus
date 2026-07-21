import { Reveal } from '@/components/public/reveal'

const FONT = 'var(--font-manrope), sans-serif'

const STATS = [
  // Uniquement des faits vérifiables du produit (audit 2026-07-21, P0-2 :
  // pas de chiffres clients inventés). Réintroduire des stats d'usage
  // réelles quand elles existeront.
  { value: '7',     label: 'règles du Code du travail vérifiées en continu' },
  { value: '2 min', label: 'pour générer un planning conforme' },
  { value: '30 j',  label: "d'essai gratuit, sans carte bancaire" },
  { value: '100 %', label: 'hébergé en Union européenne · RGPD' },
]

export function StatsBand() {
  return (
    <section style={{ position: 'relative', zIndex: 2, maxWidth: 1100, margin: '60px auto 0', padding: '0 32px', fontFamily: FONT }}>
      <Reveal className="qb-stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 20,
        background: 'linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 18,
        padding: '32px 28px',
      }}>
        {STATS.map((stat) => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 34, letterSpacing: '-0.02em', color: '#fff' }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: '#9090a8', marginTop: 6, lineHeight: 1.4 }}>{stat.label}</div>
          </div>
        ))}
      </Reveal>

      <style>{`
        @media (max-width: 767px) {
          .qb-stats-grid { grid-template-columns: repeat(2,1fr) !important; gap: 28px 20px !important; }
        }
      `}</style>
    </section>
  )
}
