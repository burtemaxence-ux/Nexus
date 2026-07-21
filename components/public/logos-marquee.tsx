import { Reveal } from '@/components/public/reveal'

const FONT = 'var(--font-manrope), sans-serif'

// Secteurs cibles — pas de noms d'établissements tant qu'il n'y a pas de
// clients réels avec accord écrit (audit 2026-07-21, P0-2 : afficher des
// clients fictifs = pratique commerciale trompeuse). Remplacer par de vrais
// logos/noms dès 3 clients consentants (plan d'action G-3).
const SECTORS = [
  'Boulangeries', 'Pâtisseries', 'Brasseries', 'Cafés',
  'Restaurants', 'Pizzerias', 'Traiteurs', 'Commerces de proximité',
]

export function LogosMarquee() {
  // Liste doublée pour un défilement en boucle continue (translateX -50%).
  const track = [...SECTORS, ...SECTORS]

  return (
    <section style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', padding: '30px 32px 10px', fontFamily: FONT }}>
      <Reveal style={{ textAlign: 'center', fontSize: 13, color: '#6b6b80', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 22 }}>
        Conçu pour les métiers de bouche et le commerce de proximité
      </Reveal>
      <div style={{
        overflow: 'hidden',
        position: 'relative',
        WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)',
        maskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)',
      }}>
        <div className="qb-marquee" style={{ display: 'flex', gap: 56, width: 'max-content' }}>
          {track.map((sector, i) => (
            <span key={i} style={{ fontWeight: 700, fontSize: 21, color: '#4f4f63', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              {sector}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes qbMarquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .qb-marquee { animation: qbMarquee 28s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .qb-marquee { animation: none; } }
      `}</style>
    </section>
  )
}
