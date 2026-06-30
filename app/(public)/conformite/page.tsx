import type { Metadata } from 'next'
import { Moon, Timer, CalendarDays, Coffee, CalendarRange, Sun, Clock } from 'lucide-react'
import { PageWrap, PageHeader, Section, CardGrid, InfoCard, FinalCta } from '@/components/public/content-page'

export const metadata: Metadata = {
  title: 'Conformité au Code du travail',
  description: "Quartzbase vérifie 7 règles du Code du travail à chaque planning : repos, durées maximales, pauses, dimanche et nuit. Soyez alerté avant la faute.",
}

const RULES = [
  { icon: <Timer size={22} color="#00D4AA" strokeWidth={1.9} />, title: 'Repos quotidien (11h)', ref: 'Art. L3131-1', body: 'Au moins 11 heures consécutives de repos entre deux journées de travail.' },
  { icon: <Clock size={22} color="#00D4AA" strokeWidth={1.9} />, title: 'Durée quotidienne (10h)', ref: 'Art. L3121-18', body: 'La durée de travail effectif ne doit pas dépasser 10 heures par jour.' },
  { icon: <CalendarRange size={22} color="#00D4AA" strokeWidth={1.9} />, title: 'Durée hebdomadaire (48h)', ref: 'Art. L3121-20', body: 'Le temps de travail ne dépasse pas 48 heures sur une même semaine.' },
  { icon: <Coffee size={22} color="#00D4AA" strokeWidth={1.9} />, title: 'Pause obligatoire', ref: 'Art. L3121-16', body: 'Au moins 20 minutes de pause dès que le temps de travail atteint 6 heures.' },
  { icon: <CalendarDays size={22} color="#00D4AA" strokeWidth={1.9} />, title: 'Repos hebdomadaire', ref: 'Art. L3132-1', body: 'Pas plus de 6 jours consécutifs de travail sans jour de repos.' },
  { icon: <Sun size={22} color="#00D4AA" strokeWidth={1.9} />, title: 'Travail du dimanche', ref: 'Art. L3132-3', body: 'Le travail dominical est signalé pour vérifier vos dérogations applicables.' },
  { icon: <Moon size={22} color="#00D4AA" strokeWidth={1.9} />, title: 'Travail de nuit', ref: 'Art. L3122-2', body: 'Le travail entre 21h et 6h est détecté pour appliquer le cadre du travail de nuit.' },
]

const STEPS = [
  { n: '1', title: 'Alerte avant la faute', body: "À chaque génération ou modification de planning, Quartzbase passe les créneaux au crible. Les infractions s’affichent en rouge, avant publication." },
  { n: '2', title: 'Un score de conformité', body: '100 = aucune anomalie. Chaque violation pèse sur le score, avec la règle concernée et une correction suggérée pour repartir au vert.' },
  { n: '3', title: 'À jour de la législation', body: 'Les règles vérifiées suivent les évolutions du Code du travail, pour que vous restiez conforme sans veille juridique.' },
]

export default function ConformitePage() {
  return (
    <PageWrap>
      <PageHeader
        eyebrow="Conformité légale"
        eyebrowColor="#00D4AA"
        title={<>La conformité vérifiée<br />à chaque planning.</>}
        intro="Repos, durées maximales, pauses, dimanche, nuit : 7 règles du Code du travail contrôlées automatiquement. Vous planifiez, on surveille."
      />

      <Section title="Les 7 règles vérifiées">
        <CardGrid cols={3}>
          {RULES.map((r) => (
            <InfoCard
              key={r.title}
              icon={r.icon}
              accent="#00D4AA"
              title={<span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{r.title}<span style={{ fontSize: 11, fontWeight: 600, color: '#79828f', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '2px 7px' }}>{r.ref}</span></span>}
            >
              {r.body}
            </InfoCard>
          ))}
        </CardGrid>
      </Section>

      <Section title="Comment ça marche">
        <CardGrid cols={3}>
          {STEPS.map((s) => (
            <InfoCard key={s.n} accent="#6C63FF" title={<span><span style={{ color: '#8b86ff' }}>{s.n}. </span>{s.title}</span>}>{s.body}</InfoCard>
          ))}
        </CardGrid>
      </Section>

      <Section>
        <p style={{ fontSize: 13.5, color: '#79828f', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
          Quartzbase est un outil d’aide à la décision. Les contrôles couvrent les règles principales du Code du travail mais ne se substituent pas à votre convention collective ni à un conseil juridique.
        </p>
      </Section>

      <FinalCta title="Ne signez plus un planning à l’aveugle" text="Voyez vos infractions avant qu’elles n’arrivent. 14 jours gratuits, sans carte bancaire." />
    </PageWrap>
  )
}
