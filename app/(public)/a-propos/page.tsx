import type { Metadata } from 'next'
import { PageWrap, PageHeader, Section, Placeholder, FinalCta } from '@/components/public/content-page'

export const metadata: Metadata = {
  title: 'À propos — Quartzbase',
  description: "L’équipe derrière Quartzbase, le planning intelligent qui vérifie la conformité et fait gagner des heures aux patrons.",
}

export default function AProposPage() {
  return (
    <PageWrap maxWidth={860}>
      <PageHeader
        eyebrow="À propos"
        title={<>On veut rendre leurs<br />soirées aux patrons.</>}
        intro="Quartzbase est né d’un constat simple : un planning fait à la main vole des heures chaque semaine, et la moindre erreur sur le Code du travail peut coûter cher."
      />

      <Section title="Notre histoire">
        <Placeholder>
          À compléter — racontez la genèse de Quartzbase (qui, quand, pourquoi). Vous pouvez réutiliser l’angle du fondateur déjà présent ailleurs sur le site.
        </Placeholder>
      </Section>

      <Section title="Notre mission">
        <Placeholder>
          À compléter — une à deux phrases sur la mission (ex. « rendre 4 heures par semaine à chaque patron, et la tranquillité qui va avec »).
        </Placeholder>
      </Section>

      <Section title="L’équipe">
        <Placeholder>
          À compléter — présentez les personnes clés (nom, rôle, éventuellement photo). Indiquez-moi les profils et je mets en place la grille.
        </Placeholder>
      </Section>

      <Section title="Nos valeurs">
        <Placeholder>
          À compléter — 3 à 4 valeurs (ex. transparence, simplicité, sans engagement). Donnez-moi la liste et je les transforme en cartes.
        </Placeholder>
      </Section>

      <FinalCta />
    </PageWrap>
  )
}
