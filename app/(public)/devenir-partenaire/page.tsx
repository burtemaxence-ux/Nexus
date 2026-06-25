import type { Metadata } from 'next'
import { PageWrap, PageHeader, Section, Placeholder } from '@/components/public/content-page'
import { Reveal } from '@/components/public/reveal'

export const metadata: Metadata = {
  title: 'Devenir partenaire — Quartzbase',
  description: "Rejoignez le programme partenaire Quartzbase : apporteurs d’affaires, experts-comptables, intégrateurs et éditeurs.",
}

export default function DevenirPartenairePage() {
  return (
    <PageWrap maxWidth={860}>
      <PageHeader
        eyebrow="Partenaires"
        eyebrowColor="#00D4AA"
        title={<>Construisons ensemble,<br />gagnons ensemble.</>}
        intro="Vous accompagnez des restaurateurs, artisans ou commerçants ? Recommandez Quartzbase et faites gagner du temps à vos clients."
      />

      <Section title="Le programme">
        <Placeholder>
          À compléter — décrivez les types de partenariat visés (apporteur d’affaires, expert-comptable, intégrateur, éditeur…). Donnez-moi la liste et je la transforme en cartes.
        </Placeholder>
      </Section>

      <Section title="Vos avantages">
        <Placeholder>
          À compléter — commission, ressources, accompagnement, co-marketing… Précisez les conditions et je les mets en forme.
        </Placeholder>
      </Section>

      <Section title="Comment candidater">
        <Placeholder>
          À compléter — étapes de candidature et critères d’éligibilité.
        </Placeholder>
      </Section>

      <Reveal style={{ margin: '64px 0 0', textAlign: 'center', background: 'linear-gradient(180deg,rgba(0,212,170,0.08),rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '48px 32px' }}>
        <h2 style={{ fontWeight: 700, fontSize: 28, letterSpacing: '-0.025em', lineHeight: 1.15, margin: '0 0 12px' }}>Envie d’en parler ?</h2>
        <p style={{ fontSize: 16, color: '#a6a8b8', lineHeight: 1.6, margin: '0 auto 28px', maxWidth: 440 }}>
          Écrivez-nous votre projet de partenariat, on revient vers vous rapidement.
        </p>
        <a
          href="mailto:hello@quartzbase.fr?subject=Partenariat%20Quartzbase"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#00D4AA', color: '#0b0b12', borderRadius: 12, padding: '16px 30px', fontFamily: 'var(--font-manrope), sans-serif', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 26px rgba(0,212,170,0.35)' }}
        >
          Nous contacter
        </a>
      </Reveal>
    </PageWrap>
  )
}
