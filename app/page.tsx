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
}

export default function LandingPage() {
  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh' }}>
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
