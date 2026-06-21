import type { Metadata } from 'next'
import { PublicNavbar }       from '@/components/public/navbar'
import { ReassuranceBar }     from '@/components/public/reassurance-bar'
import { HeroSection }        from '@/components/public/hero-section'
import { ProblemSection }     from '@/components/public/problem-section'
import { SolutionSection }    from '@/components/public/solution-section'
import { HowItWorksSection }   from '@/components/public/how-it-works-section'
import { CostSection }         from '@/components/public/cost-section'
import { ComparisonSection }  from '@/components/public/comparison-section'
import { SocialProofSection } from '@/components/public/social-proof-section'
import { PricingSection }     from '@/components/public/pricing-section'
import { FaqSection }         from '@/components/public/faq'
import { CtaFinalSection }    from '@/components/public/cta-section'
import { PublicFooter }       from '@/components/public/footer'
import { FloatingMobileCta }  from '@/components/public/floating-mobile-cta'

export const metadata: Metadata = {
  title: 'Quartzbase — Le planning qui vous protège des prud\'hommes',
  description:
    'Générez vos plannings en 2 minutes et soyez alerté avant chaque infraction au Code du Travail. 30 jours gratuits, sans carte bleue.',
  openGraph: {
    title: 'Quartzbase — Le planning qui vous protège des prud\'hommes',
    description:
      'Générez vos plannings en 2 minutes et soyez alerté avant chaque infraction au Code du Travail. 30 jours gratuits, sans carte bleue.',
    url: 'https://quartzbase.fr',
    siteName: 'Quartzbase',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quartzbase — Le planning qui vous protège des prud\'hommes',
    description:
      'Générez vos plannings en 2 minutes et soyez alerté avant chaque infraction au Code du Travail. 30 jours gratuits, sans carte bleue.',
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
        <HowItWorksSection />
        <CostSection />
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
