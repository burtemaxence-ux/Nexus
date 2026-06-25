import type { Metadata } from 'next'
import { Server, Lock, ShieldCheck, History, KeyRound, FileCheck } from 'lucide-react'
import { PageWrap, PageHeader, Section, CardGrid, InfoCard, CheckList, FinalCta } from '@/components/public/content-page'

export const metadata: Metadata = {
  title: 'Sécurité & RGPD — Quartzbase',
  description: "Hébergement en Europe, chiffrement, sauvegardes quotidiennes et conformité RGPD : comment Quartzbase protège vos données et celles de votre équipe.",
}

const PILLARS = [
  { icon: <Server size={22} color="#00D4AA" strokeWidth={1.9} />, accent: '#00D4AA', title: 'Hébergé en Europe', body: "Vos données sont hébergées sur des serveurs situés dans l'Union européenne, soumis au RGPD. Aucune donnée n'est transférée hors UE sans garanties appropriées." },
  { icon: <Lock size={22} color="#6C63FF" strokeWidth={1.9} />, accent: '#6C63FF', title: 'Chiffrement de bout en bout', body: 'Toutes les données sont chiffrées en transit (TLS) et au repos. Les mots de passe sont hachés ; personne, pas même nous, ne peut les lire.' },
  { icon: <History size={22} color="#00D4AA" strokeWidth={1.9} />, accent: '#00D4AA', title: 'Sauvegardes quotidiennes', body: 'Vos données sont sauvegardées automatiquement chaque jour, avec rétention. En cas d’incident, nous pouvons restaurer rapidement.' },
  { icon: <KeyRound size={22} color="#6C63FF" strokeWidth={1.9} />, accent: '#6C63FF', title: 'Accès cloisonné', body: "Chaque établissement ne voit que ses propres données. Les accès internes sont limités au strict nécessaire et journalisés." },
  { icon: <ShieldCheck size={22} color="#00D4AA" strokeWidth={1.9} />, accent: '#00D4AA', title: 'Conforme RGPD', body: 'Registre des traitements, base légale claire, minimisation des données et durées de conservation maîtrisées.' },
  { icon: <FileCheck size={22} color="#6C63FF" strokeWidth={1.9} />, accent: '#6C63FF', title: 'Sous-traitants encadrés', body: "Nos prestataires techniques sont sélectionnés pour leur conformité et liés par des accords de traitement (DPA)." },
]

export default function SecuritePage() {
  return (
    <PageWrap>
      <PageHeader
        eyebrow="Sécurité & RGPD"
        eyebrowColor="#00D4AA"
        title={<>Vos données protégées,<br />sans compromis.</>}
        intro="Les plannings et le dossier RH de votre équipe sont des données sensibles. Voici concrètement comment nous les sécurisons."
      />

      <Section>
        <CardGrid cols={3}>
          {PILLARS.map((p) => (
            <InfoCard key={p.title} icon={p.icon} accent={p.accent} title={p.title}>{p.body}</InfoCard>
          ))}
        </CardGrid>
      </Section>

      <Section title="Vos droits, exerçables à tout moment">
        <CheckList
          items={[
            <><strong style={{ color: '#fff' }}>Accès & portabilité</strong> — exportez l’ensemble de vos données depuis vos paramètres, dans un format réutilisable.</>,
            <><strong style={{ color: '#fff' }}>Rectification</strong> — corrigez les informations d’un employé ou de votre établissement en un clic.</>,
            <><strong style={{ color: '#fff' }}>Suppression</strong> — supprimez votre compte et vos données ; nous appliquons les durées de conservation légales puis effaçons le reste.</>,
            <><strong style={{ color: '#fff' }}>Opposition & limitation</strong> — écrivez à notre DPO pour toute demande relative au traitement de vos données.</>,
          ]}
        />
      </Section>

      <Section title="Une question sur vos données ?">
        <p style={{ fontSize: 16, color: '#a6a8b8', lineHeight: 1.7, margin: 0 }}>
          Notre délégué à la protection des données répond à toute demande RGPD à{' '}
          <a href="mailto:assistance.quartzbase@mail.fr" style={{ color: '#8b86ff', textDecoration: 'none' }}>assistance.quartzbase@mail.fr</a>.
          Pour le détail des traitements, consultez notre{' '}
          <a href="/legal/confidentialite" style={{ color: '#8b86ff', textDecoration: 'none' }}>politique de confidentialité</a>.
        </p>
      </Section>

      <FinalCta title="Planifiez l’esprit tranquille" text="Conformité RGPD et Code du travail intégrées, dès le premier planning." />
    </PageWrap>
  )
}
