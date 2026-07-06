import type { Metadata } from 'next'
import Link from 'next/link'
import { PageWrap, PageHeader, Section, CardGrid, InfoCard, FinalCta } from '@/components/public/content-page'
import { TRIAL_DAYS } from '@/lib/subscription'

export const metadata: Metadata = {
  title: 'Le Code du travail en clair',
  description: "Repos, durées maximales, pauses, dimanche, nuit, heures supplémentaires : les règles essentielles du Code du travail expliquées simplement, pour les employeurs.",
}

const TOPICS = [
  { title: 'Temps de repos', ref: 'Art. L3131-1', body: "Tout salarié a droit à au moins 11 heures de repos consécutives entre deux journées de travail. Attention aux coupures et aux fermetures tardives suivies d’une ouverture matinale." },
  { title: 'Durées maximales', ref: 'Art. L3121-18 / L3121-20', body: "10 heures par jour et 48 heures par semaine au maximum (44h en moyenne sur 12 semaines). Passé ces limites, le planning n’est pas conforme." },
  { title: 'Pauses', ref: 'Art. L3121-16', body: "Dès 6 heures de travail, une pause d’au moins 20 minutes consécutives est obligatoire. Elle n’est pas forcément rémunérée, sauf accord plus favorable." },
  { title: 'Repos hebdomadaire', ref: 'Art. L3132-1 / L3132-2', body: "Au moins 24 heures consécutives de repos par semaine, qui s’ajoutent aux 11h quotidiennes, soit 35 heures consécutives au total. Pas plus de 6 jours travaillés d’affilée." },
  { title: 'Travail du dimanche', ref: 'Art. L3132-3', body: "Le repos hebdomadaire est en principe donné le dimanche. Le travail dominical suppose une dérogation (secteur, zone, accord) : vérifiez votre cas." },
  { title: 'Travail de nuit', ref: 'Art. L3122-1 et s.', body: "Le travail entre 21h et 6h relève d’un cadre spécifique (contreparties, durées réduites). Il doit rester exceptionnel ou encadré par accord." },
  { title: 'Heures supplémentaires', ref: 'Art. L3121-28 et s.', body: "Les heures faites en plus des 35h ouvrent droit à majoration (souvent +25% puis +50%) ou repos compensateur, dans la limite du contingent applicable." },
  { title: 'Coupures', ref: 'Convention collective', body: "Les journées avec coupure (service du midi puis du soir) sont souvent encadrées par votre convention collective : nombre, durée, indemnisation." },
]

export default function CodeDuTravailPage() {
  return (
    <PageWrap>
      <PageHeader
        eyebrow="Ressource"
        title={<>Le Code du travail,<br />en clair.</>}
        intro="Les règles essentielles à connaître pour planifier sans risque. Simple, concret, sans jargon, et vérifié automatiquement par Quartzbase."
      />

      <Section>
        <CardGrid cols={2}>
          {TOPICS.map((t) => (
            <InfoCard
              key={t.title}
              accent="#6C63FF"
              title={<span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{t.title}<span style={{ fontSize: 11, fontWeight: 600, color: '#79828f', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '2px 7px' }}>{t.ref}</span></span>}
            >
              {t.body}
            </InfoCard>
          ))}
        </CardGrid>
      </Section>

      <Section title="Comment Quartzbase vous aide">
        <p style={{ fontSize: 16, color: '#a6a8b8', lineHeight: 1.7, margin: 0 }}>
          Chacune de ces règles est contrôlée à chaque planning. Vous êtes alerté avant la faute, avec la référence légale et une correction suggérée.
          Découvrez le détail sur la page{' '}
          <Link href="/conformite" style={{ color: '#8b86ff', textDecoration: 'none' }}>Conformité</Link>.
        </p>
      </Section>

      <Section>
        <p style={{ fontSize: 13.5, color: '#79828f', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
          Ce guide est fourni à titre informatif et ne constitue pas un conseil juridique. Les règles applicables dépendent de votre convention collective et de votre situation ; en cas de doute, consultez un professionnel du droit.
        </p>
      </Section>

      <FinalCta title="Restez en règle, automatiquement" text={`Laissez Quartzbase vérifier le Code du travail à votre place. ${TRIAL_DAYS} jours gratuits.`} />
    </PageWrap>
  )
}
