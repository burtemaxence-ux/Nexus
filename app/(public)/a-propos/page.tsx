import type { Metadata } from 'next'
import { PageWrap, PageHeader, Section, CardGrid, InfoCard, FinalCta } from '@/components/public/content-page'

export const metadata: Metadata = {
  title: 'À propos — Quartzbase',
  description: "Quartzbase, c'est un fondateur de 19 ans et un outil né pour régler un vrai problème : rendre aux patrons les heures que le planning leur vole.",
}

// Récit en blocs (chaînes JS pour garder les apostrophes simples).
const HISTOIRE = [
  "Quartzbase n'est pas né dans un bureau. Il est né un soir, devant la galère de quelqu'un.",
  "Maxence a 19 ans. Il code depuis qu'il est gamin, et il a grandi tout près de ces commerces où le patron fait tout : le service, la caisse, les comptes — et, une fois la porte fermée, le planning de la semaine. Un proche tenait l'un de ces établissements. Ses soirées y passaient : raturer, recommencer, recompter les heures pour être sûr de ne pas se mettre en faute.",
  "Un soir, Maxence a dit : « laisse, je te code un truc. » Le truc a fait en deux minutes ce qui prenait deux heures.",
]
const HISTOIRE_SUITE =
  "Il aurait pu en rester là. Mais d'autres patrons ont voulu le même outil. Le petit script est devenu Quartzbase — pas pour changer le monde, juste pour régler, pour de vrai, ce que des milliers de gérants vivent chaque semaine. Si vous tenez une boulangerie ou un restaurant, il a été pensé pour vous, par quelqu'un qui a vu de près ce que ça coûte de le faire à la main."

const VALEURS = [
  { title: 'Le terrain d’abord', accent: '#6C63FF', body: 'Quartzbase a d’abord servi un vrai patron, un vrai soir, avant d’être un produit. On part toujours du quotidien — jamais d’un tableau de bord vu de loin.' },
  { title: 'Simple, vraiment', accent: '#00D4AA', body: 'Si votre planning vous prend plus de dix minutes, c’est qu’on a raté quelque chose. Pas de manuel, pas de formation : si vous savez utiliser WhatsApp, vous saurez.' },
  { title: 'Sans piège', accent: '#FFB347', body: 'Sans engagement, sans carte bancaire pour essayer. Vous restez parce que ça vous fait gagner du temps — pas parce que vous êtes coincé.' },
  { title: 'Une vraie personne', accent: '#6C63FF', body: 'Une question ? C’est Maxence qui répond, souvent dans la journée. Il connaît votre prénom et votre établissement.' },
]

export default function AProposPage() {
  return (
    <PageWrap maxWidth={860}>
      <PageHeader
        eyebrow="À propos"
        title={<>On veut vous rendre<br />vos soirées.</>}
        intro="Pas une grande boîte anonyme : un fondateur de 19 ans, et un outil né pour régler un problème bien réel."
      />

      {/* Notre histoire */}
      <Section title="Notre histoire">
        <div style={{ maxWidth: 680 }}>
          {HISTOIRE.map((p, i) => (
            <p key={i} style={{ fontSize: 17.5, color: '#c2c2d4', lineHeight: 1.8, margin: i === 0 ? '0 0 20px' : '0 0 20px' }}>{p}</p>
          ))}
          <p style={{ fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.3, margin: '8px 0 24px', color: '#f0f0f8' }}>
            Ce n’était pas de la technique.{' '}
            <span style={{ background: 'linear-gradient(135deg,#8b86ff,#00D4AA)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>C’était une soirée rendue.</span>
          </p>
          <p style={{ fontSize: 17.5, color: '#c2c2d4', lineHeight: 1.8, margin: 0 }}>{HISTOIRE_SUITE}</p>
        </div>
      </Section>

      {/* Notre mission */}
      <Section title="Notre mission">
        <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.3, margin: 0, maxWidth: 740, color: '#f0f0f8' }}>
          Rendre aux patrons les heures que le planning leur vole —{' '}
          <span style={{ color: '#8b86ff' }}>et la tranquillité qui va avec.</span>
        </p>
      </Section>

      {/* L'équipe */}
      <Section title="L’équipe">
        <p style={{ fontSize: 16, color: '#a6a8b8', lineHeight: 1.7, margin: '0 0 22px', maxWidth: 620 }}>
          Pour l’instant, Quartzbase, c’est surtout une personne.
        </p>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '26px 28px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#6C63FF,#00D4AA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24, color: '#0b0b12', flexShrink: 0 }}>MB</div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Maxence</div>
            <div style={{ fontSize: 13.5, color: '#8b86ff', marginBottom: 12 }}>Fondateur · celui qui code — et qui vous répond</div>
            <p style={{ fontSize: 15, color: '#a6a8b8', lineHeight: 1.7, margin: 0 }}>
              C’est lui qui construit l’outil. C’est aussi lui qui répond quand vous écrivez : pas de centre d’appel, pas de ticket n° 4 832. La personne au bout du message est celle qui a fait le produit, et qui connaît chaque établissement qui l’utilise. Une petite équipe, ça fait peut-être moins sérieux qu’un grand logo. On préfère l’assumer : vous savez exactement à qui vous confiez votre planning.
            </p>
          </div>
        </div>
      </Section>

      {/* Nos valeurs */}
      <Section title="Nos valeurs">
        <CardGrid cols={2}>
          {VALEURS.map((v) => (
            <InfoCard key={v.title} accent={v.accent} title={v.title}>{v.body}</InfoCard>
          ))}
        </CardGrid>
      </Section>

      <FinalCta title="Faites connaissance avec l’outil" text="Le meilleur moyen de savoir si on parle votre langue : essayer. 14 jours gratuits, sans carte bancaire." />
    </PageWrap>
  )
}
