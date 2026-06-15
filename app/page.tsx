import type { Metadata } from 'next'
import { PublicNavbar }       from '@/components/public/navbar'
import { ReassuranceBar }     from '@/components/public/reassurance-bar'
import { HeroSection }        from '@/components/public/hero-section'
import { ProblemSection }     from '@/components/public/problem-section'
import { SolutionSection }    from '@/components/public/solution-section'
import { ComparisonSection }  from '@/components/public/comparison-section'
import { SocialProofSection } from '@/components/public/social-proof-section'
import { PricingSection }     from '@/components/public/pricing-section'
import { FaqSection }         from '@/components/public/faq'
import { CtaFinalSection }    from '@/components/public/cta-section'
import { PublicFooter }       from '@/components/public/footer'
import { FloatingMobileCta }  from '@/components/public/floating-mobile-cta'

export const metadata: Metadata = {
  title: 'Quartzbase — Planning restauration intelligent',
  description:
    'Créez le planning de votre équipe en 2 minutes avec l\'IA. Conforme Code du Travail. Jusqu\'à 4 fois moins cher.',
  openGraph: {
    title: 'Quartzbase — Planning restauration intelligent',
    description:
      'Planning IA pour la restauration et l\'artisanat. Conformité automatique. 14 jours gratuits, sans carte bleue.',
    url: 'https://quartzbase.fr',
    siteName: 'Quartzbase',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quartzbase — Planning restauration intelligent',
    description:
      'Créez le planning de votre équipe en 2 minutes avec l\'IA. Conforme Code du Travail. Jusqu\'à 4 fois moins cher.',
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
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <PublicNavbar />
      <ReassuranceBar />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <ComparisonSection />
        <SocialProofSection />
        <PricingSection />
        <FaqSection />
        <CtaFinalSection />
      </main>
      <PublicFooter />
      <FloatingMobileCta />
    </div>
  )
}
