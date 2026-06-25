import type { Metadata } from 'next'
import { UserPlus, Sparkles, Send, Clock, ListChecks, Smartphone } from 'lucide-react'
import { PageWrap, PageHeader, Section, CardGrid, InfoCard, CheckList, FinalCta } from '@/components/public/content-page'

export const metadata: Metadata = {
  title: 'Guide de démarrage Quartzbase',
  description: "Démarrez avec Quartzbase en 10 minutes : ajoutez votre équipe, générez un premier planning avec l’IA et prévenez vos salariés. Mode d’emploi pas à pas.",
}

const STEPS = [
  { icon: <UserPlus size={22} color="#6C63FF" strokeWidth={1.9} />, accent: '#6C63FF', n: '1', title: 'Ajoutez votre équipe', body: "Créez vos salariés (nom, mail, poste, contrat, heures hebdo). Chacun reçoit une invitation pour accéder à son planning sur son téléphone. Aucun import de fichier requis." },
  { icon: <Sparkles size={22} color="#8b86ff" strokeWidth={1.9} />, accent: '#8b86ff', n: '2', title: 'Générez le planning', body: "Décrivez vos besoins en une phrase (« 3 serveurs le soir, fermé lundi »). L’IA propose un planning équilibré et conforme en quelques secondes. Vous ajustez avant de publier." },
  { icon: <Send size={22} color="#00D4AA" strokeWidth={1.9} />, accent: '#00D4AA', n: '3', title: 'Prévenez votre équipe', body: "Publiez : chaque salarié est notifié et retrouve son planning sur son téléphone. Fini les photos floues dans le groupe WhatsApp." },
]

export default function GuideDemarragePage() {
  return (
    <PageWrap>
      <PageHeader
        eyebrow="Guide de démarrage"
        title={<>Opérationnel en<br />10 minutes.</>}
        intro="Pas de formation, pas de paperasse. Voici les trois étapes pour faire votre premier planning conforme dès aujourd’hui."
      />

      <Section>
        <CardGrid cols={3}>
          {STEPS.map((s) => (
            <InfoCard key={s.n} icon={s.icon} accent={s.accent} title={<span><span style={{ color: s.accent }}>{s.n}. </span>{s.title}</span>}>{s.body}</InfoCard>
          ))}
        </CardGrid>
      </Section>

      <Section title="Pour bien démarrer">
        <CheckList
          items={[
            <>Renseignez le <strong style={{ color: '#fff' }}>taux horaire</strong> de chaque salarié : c’est ce qui rend la masse salariale et le coût/CA précis.</>,
            <>Après une génération IA, utilisez le bouton <strong style={{ color: '#fff' }}>« Vérifier »</strong> pour contrôler la conformité du planning.</>,
            <>Créez une <strong style={{ color: '#fff' }}>semaine type</strong> que vous réutilisez ensuite : vous gagnez encore du temps chaque semaine.</>,
            <>Activez les <strong style={{ color: '#fff' }}>notifications</strong> pour être prévenu des absences et des demandes de congés.</>,
          ]}
        />
      </Section>

      <Section title="Ce que vous débloquez tout de suite">
        <CardGrid cols={3}>
          <InfoCard icon={<Clock size={22} color="#6C63FF" strokeWidth={1.9} />} accent="#6C63FF" title="Badgeuse et présences">Vos équipes pointent depuis leur téléphone ; les heures réelles se comparent au planning.</InfoCard>
          <InfoCard icon={<ListChecks size={22} color="#00D4AA" strokeWidth={1.9} />} accent="#00D4AA" title="Congés et conformité">Validez les congés et bloquez automatiquement la planification sur ces jours.</InfoCard>
          <InfoCard icon={<Smartphone size={22} color="#6C63FF" strokeWidth={1.9} />} accent="#6C63FF" title="Tout sur mobile">Vos salariés consultent planning, congés et échanges sans rien installer.</InfoCard>
        </CardGrid>
      </Section>

      <FinalCta title="Faites votre premier planning" text="10 minutes suffisent. 14 jours gratuits, sans carte bancaire, sans engagement." />
    </PageWrap>
  )
}
