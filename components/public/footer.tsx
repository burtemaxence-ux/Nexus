import Link from 'next/link'
import { Lock, ShieldCheck, Smartphone, Linkedin, Instagram, Music2 } from 'lucide-react'

const FONT = 'var(--font-manrope), sans-serif'

/** Lien de colonne : href connu → Link ; sinon span inerte (destination à définir). */
type FooterLink = { label: string; href?: string; external?: boolean }

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalités',  href: '#fonctionnalites' },
      { label: 'Tarifs',           href: '#tarifs' },
      { label: 'Conformité légale' }, // pas de page dédiée — à relier
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: 'Guide de démarrage' },                                  // à relier
      { label: 'Le Code du travail' },                                  // à relier
      { label: 'Nous contacter', href: 'mailto:hello@quartzbase.fr', external: true },
    ],
  },
  {
    title: 'Entreprise',
    links: [
      { label: 'À propos' },                                            // à relier
      { label: 'Sécurité & RGPD', href: '/legal/confidentialite' },
      { label: 'Devenir partenaire' },                                  // à relier
    ],
  },
]

const SOCIALS = [
  { label: 'LinkedIn',  icon: <Linkedin  size={17} /> },
  { label: 'Instagram', icon: <Instagram size={17} /> },
  { label: 'TikTok',    icon: <Music2    size={17} /> },
]

const TRUST = [
  { icon: <Lock        size={16} color="#00D4AA" strokeWidth={1.9} />, label: 'Données chiffrées' },
  { icon: <ShieldCheck size={16} color="#00D4AA" strokeWidth={1.9} />, label: 'Conforme RGPD' },
  { icon: <Smartphone  size={16} color="#9090a8" strokeWidth={1.9} />, label: 'Hébergé en Europe' },
]

const LEGAL = [
  { label: 'Mentions légales', href: '/legal/mentions-legales' },
  { label: 'CGU',              href: '/legal/cgu' },
  { label: 'Confidentialité',  href: '/legal/confidentialite' },
]

const LINK_STYLE: React.CSSProperties = { fontSize: 14, color: '#a6a8b8', textDecoration: 'none', cursor: 'pointer' }

function ColumnLink({ link }: { link: FooterLink }) {
  if (!link.href) {
    return <span className="qb-foot-link" style={{ ...LINK_STYLE, cursor: 'default' }}>{link.label}</span>
  }
  if (link.external) {
    return <a className="qb-foot-link" href={link.href} style={LINK_STYLE}>{link.label}</a>
  }
  return <Link className="qb-foot-link" href={link.href} style={LINK_STYLE}>{link.label}</Link>
}

export function PublicFooter() {
  return (
    <footer style={{ position: 'relative', zIndex: 2, marginTop: 120, borderTop: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(180deg,rgba(108,99,255,0.04),transparent)', fontFamily: FONT }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 32px 0' }}>
        <div className="qb-footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 40 }}>

          {/* Marque */}
          <div style={{ maxWidth: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#6C63FF,#00D4AA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#0b0b12' }}>Q</span>
              <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em' }}>Quartzbase</span>
            </div>
            <p style={{ fontSize: 14, color: '#9090a8', lineHeight: 1.6, margin: '0 0 20px' }}>
              Le planning intelligent qui vérifie la conformité, prévient votre équipe et vous fait gagner des heures chaque semaine.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                {SOCIALS.map((s) => (
                  <span key={s.label} aria-label={s.label} title={`${s.label} — bientôt`} style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f4f63', opacity: 0.6, cursor: 'default' }}>
                    {s.icon}
                  </span>
                ))}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#79828f', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 9px', borderRadius: 7, whiteSpace: 'nowrap' }}>Bientôt</span>
            </div>
          </div>

          {/* Colonnes de liens */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b6b80', marginBottom: 18 }}>{col.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {col.links.map((link) => <ColumnLink key={link.label} link={link} />)}
              </div>
            </div>
          ))}
        </div>

        {/* Bande de confiance */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 48, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {TRUST.map((b) => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#9090a8' }}>
              {b.icon}<span>{b.label}</span>
            </div>
          ))}
        </div>

        {/* Barre légale */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, padding: '24px 0 36px' }}>
          <div style={{ fontSize: 13, color: '#5a5a72' }}>© 2026 Quartzbase — Conçu et hébergé en France 🇫🇷</div>
          <div style={{ display: 'flex', gap: 22, fontSize: 12.5 }}>
            {LEGAL.map((l) => (
              <Link key={l.href} className="qb-foot-link" href={l.href} style={{ color: '#5a5a72', textDecoration: 'none', cursor: 'pointer' }}>{l.label}</Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .qb-foot-link { transition: color .18s ease; }
        a.qb-foot-link:hover, .qb-foot-link[href]:hover { color: #f0f0f8 !important; }
        @media (max-width: 767px) {
          .qb-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          .qb-footer-grid > div:first-child { grid-column: 1 / -1; }
        }
      `}</style>
    </footer>
  )
}
