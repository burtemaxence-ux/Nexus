import type { Metadata } from 'next'
import { Moon, Timer, CalendarDays, Coffee, CalendarRange, Sun, Clock, Gauge, Hourglass, GraduationCap, Scissors, FileText } from 'lucide-react'
import { PageWrap, PageHeader, Section, CardGrid, InfoCard, FinalCta } from '@/components/public/content-page'
import { RULE_COUNT } from '@/lib/compliance/rules'
import { TRIAL_DAYS } from '@/lib/subscription'

export const metadata: Metadata = {
  title: 'Conformité au Code du travail',
  description: `Quartzbase vérifie ${RULE_COUNT} règles du Code du travail à chaque planning : repos, durées maximales, pauses, nuit, apprentis mineurs, temps partiel. Soyez alerté avant la faute.`,
}

const ACCENT = '#00D4AA'
const ico = (Icon: typeof Timer) => <Icon size={22} color={ACCENT} strokeWidth={1.9} />

// Socle général — durées, repos, pauses, jours travaillés.
const RULES_SOCLE = [
  { icon: ico(Timer), title: 'Repos quotidien (11h)', ref: 'Art. L3131-1', body: 'Au moins 11 heures consécutives de repos entre deux journées de travail.' },
  { icon: ico(CalendarDays), title: 'Repos hebdomadaire (35h)', ref: 'Art. L3132-2', body: 'Un repos continu d’au moins 35 heures (24h + 11h) sur chaque semaine.' },
  { icon: ico(Clock), title: 'Durée quotidienne (10h)', ref: 'Art. L3121-18', body: 'La durée de travail effectif ne dépasse pas 10 heures par jour.' },
  { icon: ico(CalendarRange), title: 'Durée hebdomadaire (48h)', ref: 'Art. L3121-20', body: 'Le temps de travail ne dépasse pas 48 heures sur une même semaine.' },
  { icon: ico(Gauge), title: 'Moyenne 44h / 12 semaines', ref: 'Art. L3121-22', body: 'La moyenne hebdomadaire ne dépasse pas 44 heures sur 12 semaines glissantes.' },
  { icon: ico(Hourglass), title: 'Amplitude journalière (13h)', ref: 'Art. L3121-1', body: 'L’amplitude entre le début et la fin de la journée reste sous 13 heures.' },
  { icon: ico(Coffee), title: 'Pause obligatoire', ref: 'Art. L3121-16', body: 'Au moins 20 minutes de pause dès que le temps de travail atteint 6 heures.' },
  { icon: ico(CalendarDays), title: 'Jours consécutifs (6 max)', ref: 'Art. L3132-1', body: 'Pas plus de 6 jours consécutifs de travail sans jour de repos.' },
]

// Travail de nuit & dimanche.
const RULES_NIGHT = [
  { icon: ico(Sun), title: 'Travail du dimanche', ref: 'Art. L3132-3', body: 'Le travail dominical est signalé pour vérifier vos dérogations applicables.' },
  { icon: ico(Moon), title: 'Travail de nuit', ref: 'Art. L3122-2', body: 'Le travail entre 21h et 6h est détecté pour appliquer le cadre du travail de nuit.' },
]

// Apprentis mineurs — protections renforcées.
const RULES_MINORS = [
  { icon: ico(GraduationCap), title: 'Mineur — durée quotidienne (8h)', ref: 'Art. L3162-1', body: 'Un apprenti mineur ne travaille pas plus de 8 heures par jour.' },
  { icon: ico(GraduationCap), title: 'Mineur — durée hebdomadaire (35h)', ref: 'Art. L3162-1', body: 'La durée hebdomadaire d’un mineur est plafonnée à 35 heures.' },
  { icon: ico(GraduationCap), title: 'Mineur — travail de nuit interdit', ref: 'Art. L3163-1', body: 'Travail interdit de 22h à 6h (de 20h à 6h avant 16 ans).' },
  { icon: ico(GraduationCap), title: 'Mineur — repos quotidien renforcé', ref: 'Art. L3164-1', body: 'Au moins 12 heures de repos (14 heures avant 16 ans).' },
  { icon: ico(GraduationCap), title: 'Mineur — pause (30 min)', ref: 'Art. L3162-3', body: 'Une pause de 30 minutes dès 4h30 de travail continu.' },
]

// Temps partiel & heures contractuelles.
const RULES_CONTRACT = [
  { icon: ico(Scissors), title: 'Coupure temps partiel', ref: 'Art. L3123-23', body: 'Au plus une interruption par jour pour un salarié à temps partiel (spécificités CCN HCR).' },
  { icon: ico(FileText), title: 'Heures contractuelles', ref: 'Contrat', body: 'Alerte si les heures planifiées dépassent la durée prévue au contrat.' },
]

const STEPS = [
  { n: '1', title: 'Alerte avant la faute', body: "À chaque génération ou modification de planning, Quartzbase passe les créneaux au crible. Les infractions s’affichent en rouge, avant publication." },
  { n: '2', title: 'Un score de conformité', body: '100 = aucune anomalie. Chaque violation pèse sur le score, avec la règle concernée et une correction suggérée pour repartir au vert.' },
  { n: '3', title: 'À jour de la législation', body: 'Les règles vérifiées suivent les évolutions du Code du travail, pour que vous restiez conforme sans veille juridique.' },
]

function RuleCards({ rules }: { rules: typeof RULES_SOCLE }) {
  return (
    <CardGrid cols={3}>
      {rules.map((r) => (
        <InfoCard
          key={r.title}
          icon={r.icon}
          accent={ACCENT}
          title={<span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{r.title}<span style={{ fontSize: 11, fontWeight: 600, color: '#79828f', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '2px 7px' }}>{r.ref}</span></span>}
        >
          {r.body}
        </InfoCard>
      ))}
    </CardGrid>
  )
}

export default function ConformitePage() {
  return (
    <PageWrap>
      <PageHeader
        eyebrow="Conformité légale"
        eyebrowColor={ACCENT}
        title={<>La conformité vérifiée<br />à chaque planning.</>}
        intro={`Repos, durées maximales, pauses, nuit, apprentis mineurs, temps partiel : ${RULE_COUNT} règles du Code du travail contrôlées automatiquement. Vous planifiez, on surveille.`}
      />

      <Section title="Durées, repos et pauses">
        <RuleCards rules={RULES_SOCLE} />
      </Section>

      <Section title="Travail de nuit et du dimanche">
        <RuleCards rules={RULES_NIGHT} />
      </Section>

      <Section title="Apprentis mineurs — protections renforcées">
        <RuleCards rules={RULES_MINORS} />
      </Section>

      <Section title="Temps partiel et heures contractuelles">
        <RuleCards rules={RULES_CONTRACT} />
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

      <FinalCta title="Ne signez plus un planning à l’aveugle" text={`Voyez vos infractions avant qu’elles n’arrivent. ${TRIAL_DAYS} jours gratuits, sans carte bancaire.`} />
    </PageWrap>
  )
}
