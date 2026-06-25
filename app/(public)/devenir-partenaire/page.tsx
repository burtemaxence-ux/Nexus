import type { Metadata } from 'next'
import { Calculator, Handshake, Wrench, Puzzle, Building2, Megaphone, Package, MessageCircle, Star, LayoutDashboard, ArrowRight } from 'lucide-react'
import { PageWrap, PageHeader, Section, CardGrid, InfoCard } from '@/components/public/content-page'
import { Reveal } from '@/components/public/reveal'

const FONT = 'var(--font-manrope), sans-serif'

export const metadata: Metadata = {
  title: 'Devenir partenaire de Quartzbase',
  description: "Recommandez Quartzbase aux restaurateurs et artisans que vous connaissez, et touchez une commission récurrente chaque mois. Programme ouvert aux experts comptables, apporteurs d'affaires, installateurs et créateurs de contenu.",
}

const PROFILS = [
  { icon: <Calculator size={22} color="#6C63FF" strokeWidth={1.9} />, accent: '#6C63FF', priority: true, title: 'Experts comptables CHR', who: "Vous tenez la paie et la compta de dizaines de restaurants et boulangeries.", benefit: "Un planning conforme au Code du travail, c'est une paie plus propre et moins de litiges pour vous. Vous gagnez une commission, et du temps sur vos dossiers." },
  { icon: <Handshake size={22} color="#00D4AA" strokeWidth={1.9} />, accent: '#00D4AA', title: "Apporteurs d'affaires", who: "Consultant, ancien restaurateur, commercial du secteur food, formateur.", benefit: "Vous connaissez du monde. Transformez votre carnet d'adresses en revenu qui tombe chaque mois, sans rien gérer de technique." },
  { icon: <Wrench size={22} color="#6C63FF" strokeWidth={1.9} />, accent: '#6C63FF', title: 'Installateurs & prestataires tech', who: "Vous posez les caisses, le wifi, les logiciels des établissements.", benefit: "Vous avez déjà un pied dans chaque resto. Ajoutez Quartzbase à ce que vous installez et recommandez." },
  { icon: <Puzzle size={22} color="#FFB347" strokeWidth={1.9} />, accent: '#FFB347', title: 'Éditeurs de logiciels', who: "Caisse, réservation, livraison, gestion de stock.", benefit: "Recommandation croisée : vous parlez de Quartzbase à vos clients, on parle de vous aux nôtres. Tout le monde y gagne." },
  { icon: <Building2 size={22} color="#6C63FF" strokeWidth={1.9} />, accent: '#6C63FF', title: 'Réseaux & franchises', who: "Tête de réseau en boulangerie ou restauration.", benefit: "Déployez Quartzbase sur tous vos établissements d'un coup. Gros volume, conditions dédiées." },
  { icon: <Megaphone size={22} color="#00D4AA" strokeWidth={1.9} />, accent: '#00D4AA', title: 'Créateurs de contenu', who: "Vous parlez aux restaurateurs et artisans sur TikTok, Insta ou LinkedIn.", benefit: "Affiliation à la performance : vous touchez sur chaque établissement qui s'abonne grâce à vous." },
]

const AVANTAGES = [
  { icon: <Package size={22} color="#6C63FF" strokeWidth={1.9} />, accent: '#6C63FF', title: 'Tout pour vendre', body: "Kit de présentation, démo dédiée, page de vente à votre nom et code de suivi. Vous arrivez équipé, pas les mains vides." },
  { icon: <MessageCircle size={22} color="#00D4AA" strokeWidth={1.9} />, accent: '#00D4AA', title: 'Le fondateur en direct', body: "Vous parlez à Maxence, pas à un service client. Support prioritaire, et un coup de main pour votre première démo client." },
  { icon: <Star size={22} color="#FFB347" strokeWidth={1.9} />, accent: '#FFB347', title: 'Visibilité partagée', body: "Mise en avant sur notre site, citation, étude de cas commune. On vous met en lumière auprès de notre audience." },
  { icon: <LayoutDashboard size={22} color="#6C63FF" strokeWidth={1.9} />, accent: '#6C63FF', title: 'Suivi en temps réel', body: "Un tableau de bord partenaire pour voir vos clients amenés et vos commissions au fil de l'eau, propulsé par Stripe." },
]

const STEPS = [
  { n: '1', accent: '#6C63FF', title: 'Vous candidatez', body: "Un formulaire court : qui vous êtes, votre réseau, le type de clients que vous touchez." },
  { n: '2', accent: '#8b86ff', title: 'On échange', body: "Un appel de 15 minutes avec Maxence pour vérifier qu'on est bien alignés." },
  { n: '3', accent: '#00D4AA', title: 'On vous équipe', body: "Accès partenaire, kit de vente et votre code de suivi. Vous êtes prêt à recommander." },
  { n: '4', accent: '#00D4AA', title: 'Vous recommandez, vous gagnez', body: "Chaque client qui s'abonne grâce à vous vous rapporte, chaque mois." },
]

export default function DevenirPartenairePage() {
  return (
    <PageWrap>
      <PageHeader
        eyebrow="Partenaires"
        eyebrowColor="#00D4AA"
        title={<>Vos clients gagnent du temps.<br />Vous gagnez un revenu.</>}
        intro="Les restaurateurs et artisans que vous connaissez perdent des heures sur leurs plannings et stressent pour la conformité. Quartzbase règle ça. Vous les mettez en relation, et vous touchez une commission chaque mois, tant qu'ils restent clients."
      />

      {/* Le programme */}
      <Section title="À qui s'adresse le programme">
        <CardGrid cols={3}>
          {PROFILS.map((p) => (
            <InfoCard
              key={p.title}
              icon={p.icon}
              accent={p.accent}
              title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {p.title}
                  {p.priority && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#00D4AA', background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 6, padding: '2px 7px' }}>Partenaire idéal</span>
                  )}
                </span>
              }
            >
              <span style={{ display: 'block', fontWeight: 600, color: '#cfcfe0', marginBottom: 6 }}>{p.who}</span>
              {p.benefit}
            </InfoCard>
          ))}
        </CardGrid>
      </Section>

      {/* Angle dédié expert comptable */}
      <Reveal style={{ margin: '40px 0 0', background: 'linear-gradient(180deg,rgba(108,99,255,0.10),rgba(255,255,255,0.01))', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 18, padding: '28px 30px', fontFamily: FONT }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#8b86ff', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Vous êtes expert comptable spécialisé CHR ?</div>
        <p style={{ fontSize: 16, color: '#cfcfe0', lineHeight: 1.7, margin: 0, maxWidth: 760 }}>
          Vous êtes notre partenaire le plus précieux, et c’est gagnant deux fois. Vous touchez une commission sur chaque client que vous recommandez, et comme leurs plannings deviennent conformes, vos dossiers de paie sont plus propres. Moins d’erreurs, moins de litiges, moins de temps perdu de votre côté.
        </p>
      </Reveal>

      {/* Vos avantages : commission */}
      <Section title="Vos avantages">
        <Reveal style={{ background: 'linear-gradient(135deg,rgba(108,99,255,0.16),rgba(0,212,170,0.08))', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 18, padding: '32px 30px', fontFamily: FONT }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#00D4AA', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>L’avantage clé</div>
          <h3 style={{ fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em', lineHeight: 1.2, margin: '0 0 12px' }}>Une commission qui tombe chaque mois.</h3>
          <p style={{ fontSize: 16, color: '#cfcfe0', lineHeight: 1.7, margin: '0 0 24px', maxWidth: 720 }}>
            Vous touchez <strong style={{ color: '#fff' }}>25 %</strong> <span style={{ color: '#9090a8' }}>[à ajuster selon marge]</span> de ce que paient vos clients, chaque mois, tant qu’ils restent. Pas une prime versée une seule fois : un revenu qui grossit à mesure que vous recommandez.
          </p>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', background: 'rgba(11,11,18,0.35)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 44, letterSpacing: '-0.03em', background: 'linear-gradient(135deg,#fff,#b3aeff)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>222 €</span>
                <span style={{ fontSize: 16, color: '#9090a8' }}>/ mois</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#79828f', marginTop: 2 }}>récurrent, mois après mois</div>
            </div>
            <div style={{ flex: 1, minWidth: 240, fontSize: 14.5, color: '#a6a8b8', lineHeight: 1.6 }}>
              Un expert comptable qui amène <strong style={{ color: '#fff' }}>10 restaurants</strong> au plan Pro (89€/mois), c’est 890€ de chiffre chaque mois. À 25 %, ça vous fait environ <strong style={{ color: '#fff' }}>222€ par mois</strong>, tant qu’ils restent clients.
            </div>
          </div>
        </Reveal>

        <div style={{ marginTop: 18 }}>
          <CardGrid cols={2}>
            {AVANTAGES.map((a) => (
              <InfoCard key={a.title} icon={a.icon} accent={a.accent} title={a.title}>{a.body}</InfoCard>
            ))}
          </CardGrid>
        </div>
      </Section>

      {/* Conditions de lancement */}
      <Reveal style={{ margin: '40px 0 0', background: 'linear-gradient(180deg,rgba(0,212,170,0.10),rgba(255,255,255,0.01))', border: '1px solid rgba(0,212,170,0.25)', borderRadius: 18, padding: '28px 30px', fontFamily: FONT }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#00D4AA', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Conditions de lancement</div>
        <p style={{ fontSize: 17, color: '#f0f0f8', lineHeight: 1.7, margin: 0, maxWidth: 760 }}>
          <strong style={{ color: '#fff' }}>Ce sont les meilleures conditions que nous offrirons jamais.</strong> Quartzbase démarre. Les partenaires qui nous rejoignent maintenant prennent les meilleures places : commission plus élevée, visibilité maximale, accès direct au fondateur. Plus tard, ce ne sera plus possible.
        </p>
      </Reveal>

      {/* Comment candidater */}
      <Section title="Comment devenir partenaire">
        <CardGrid cols={2}>
          {STEPS.map((s) => (
            <InfoCard key={s.n} accent={s.accent} title={<span><span style={{ color: s.accent }}>{s.n}. </span>{s.title}</span>}>{s.body}</InfoCard>
          ))}
        </CardGrid>
        <p style={{ fontSize: 14.5, color: '#79828f', lineHeight: 1.7, margin: '22px 0 0', maxWidth: 720 }}>
          Ce qu’on demande : un lien réel avec le secteur (restauration, boulangerie, artisans) et la capacité à recommander de façon crédible. Pas de barrière inutile, mais on choisit des partenaires sérieux, pas des opportunistes.
        </p>
      </Section>

      {/* CTA */}
      <Reveal style={{ margin: '64px 0 0', textAlign: 'center', background: 'linear-gradient(180deg,rgba(0,212,170,0.08),rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '48px 32px', fontFamily: FONT }}>
        <h2 style={{ fontWeight: 700, fontSize: 30, letterSpacing: '-0.025em', lineHeight: 1.15, margin: '0 0 12px' }}>Prenez les meilleures places.</h2>
        <p style={{ fontSize: 16, color: '#a6a8b8', lineHeight: 1.6, margin: '0 auto 28px', maxWidth: 460 }}>
          Présentez votre projet de partenariat. Réponse sous 48h, directement par Maxence.
        </p>
        <a
          href="mailto:hello@quartzbase.fr?subject=Devenir%20partenaire%20Quartzbase"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#00D4AA', color: '#0b0b12', borderRadius: 12, padding: '16px 30px', fontFamily: FONT, fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 26px rgba(0,212,170,0.35)' }}
        >
          Devenir partenaire
          <ArrowRight size={18} strokeWidth={2.4} />
        </a>
      </Reveal>
    </PageWrap>
  )
}
