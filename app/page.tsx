import type { Metadata } from 'next'
import { PublicNavbar }       from '@/components/public/navbar'
import { HeroSection }        from '@/components/public/hero-section'
import { ReassuranceBar }     from '@/components/public/reassurance-bar'
import { LogosMarquee }       from '@/components/public/logos-marquee'
import { StatsBand }          from '@/components/public/stats-band'
import { ProblemSection }     from '@/components/public/problem-section'
import { SolutionSection }    from '@/components/public/solution-section'
import { HowItWorksSection }  from '@/components/public/how-it-works-section'
import { SocialProofSection } from '@/components/public/social-proof-section'
import { ComparisonSection }  from '@/components/public/comparison-section'
import { PricingSection }     from '@/components/public/pricing-section'
import { FaqSection }         from '@/components/public/faq'
import { CtaFinalSection }    from '@/components/public/cta-section'
import { PublicFooter }       from '@/components/public/footer'
import { FloatingMobileCta }  from '@/components/public/floating-mobile-cta'
import { LandingStyles }      from '@/components/public/landing-styles'
import { TRIAL_DAYS }         from '@/lib/subscription'

const SEO_DESCRIPTION =
  `Générez vos plannings en 2 minutes et soyez alerté avant chaque infraction au Code du Travail. ${TRIAL_DAYS} jours gratuits, sans carte bancaire.`

export const metadata: Metadata = {
  title: 'Quartzbase — Le planning qui vous protège des prud\'hommes',
  description: SEO_DESCRIPTION,
  openGraph: {
    title: 'Quartzbase — Le planning qui vous protège des prud\'hommes',
    description: SEO_DESCRIPTION,
    url: 'https://quartzbase.fr',
    siteName: 'Quartzbase',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quartzbase — Le planning qui vous protège des prud\'hommes',
    description: SEO_DESCRIPTION,
  },
}

// Données structurées pour les rich snippets (SoftwareApplication + offres).
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Quartzbase',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  description:
    'Logiciel de planning intelligent pour la restauration et l\'artisanat : génération du planning par IA, badgeuse mobile, congés et conformité Code du Travail.',
  url: 'https://quartzbase.fr',
  inLanguage: 'fr-FR',
  offers: [
    { '@type': 'Offer', name: 'Essentiel', price: '49', priceCurrency: 'EUR' },
    { '@type': 'Offer', name: 'Pro', price: '89', priceCurrency: 'EUR' },
    { '@type': 'Offer', name: 'Multi-site', price: '149', priceCurrency: 'EUR' },
  ],
}

export default function LandingPage() {
  return (
    <div
      style={{
        background: '#0b0b12',
        color: '#f0f0f8',
        fontFamily: 'var(--font-manrope), sans-serif',
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      {/* ── Décor ambiant : trame de points + halos radiaux ───────────── */}
      {/* overflow:hidden ici (et non sur le wrapper) pour clipper les halos
          sans casser le `position:sticky` de la nav. */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)',
          backgroundSize: '42px 42px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%,#000,transparent 75%)',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%,#000,transparent 75%)',
          opacity: 0.5,
        }} />
        <div className="qb-glow" style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 900, height: 600, background: 'radial-gradient(ellipse at center,rgba(108,99,255,0.20),transparent 65%)', animationDuration: '7s' }} />
        <div className="qb-glow" style={{ position: 'absolute', top: 120, right: -150, width: 500, height: 500, background: 'radial-gradient(ellipse at center,rgba(0,212,170,0.12),transparent 65%)', animationDuration: '9s' }} />
        <div className="qb-glow" style={{ position: 'absolute', top: 1700, left: -200, width: 620, height: 620, background: 'radial-gradient(ellipse at center,rgba(108,99,255,0.10),transparent 68%)', animationDuration: '11s' }} />
        <div className="qb-glow" style={{ position: 'absolute', top: 3000, right: -180, width: 560, height: 560, background: 'radial-gradient(ellipse at center,rgba(0,212,170,0.08),transparent 68%)', animationDuration: '13s' }} />
        <div className="qb-glow" style={{ position: 'absolute', bottom: 200, left: '50%', transform: 'translateX(-50%)', width: 800, height: 500, background: 'radial-gradient(ellipse at center,rgba(108,99,255,0.10),transparent 65%)', animationDuration: '10s' }} />
      </div>

      <PublicNavbar />

      <main style={{ position: 'relative', zIndex: 2 }}>
        <HeroSection />
        <ReassuranceBar />
        <LogosMarquee />
        <StatsBand />
        <ProblemSection />
        <SolutionSection />
        <HowItWorksSection />
        <SocialProofSection />
        <ComparisonSection />
        <PricingSection />
        <FaqSection />
        <CtaFinalSection />
      </main>

      <PublicFooter />
      <FloatingMobileCta />

      <LandingStyles />
    </div>
  )
}
