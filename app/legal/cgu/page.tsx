import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — Nexus",
}

export default function CguPage() {
  return (
    <article className="prose-legal">
      <h1>Conditions Générales d&apos;Utilisation</h1>
      <p className="updated">Dernière mise à jour : 25 mai 2025</p>

      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») définissent les modalités d&apos;accès et d&apos;utilisation de la Plateforme <strong>Nexus</strong>, éditée par Quartz SAS (ci-après « l&apos;Éditeur »).
        </p>
        <p>
          Toute utilisation de la Plateforme implique l&apos;acceptation pleine et entière des présentes CGU. Si vous n&apos;acceptez pas ces conditions, vous devez cesser immédiatement d&apos;utiliser la Plateforme.
        </p>
      </section>

      <section>
        <h2>2. Description du service</h2>
        <p>
          Nexus est une plateforme SaaS de gestion des ressources humaines destinée aux établissements de restauration. Elle permet notamment :
        </p>
        <ul>
          <li>La gestion du planning hebdomadaire et journalier des équipes</li>
          <li>Le suivi des présences et des pointages (badgeuse)</li>
          <li>La gestion des demandes de congés et absences</li>
          <li>La génération d&apos;alertes RH (retards, fins de contrat)</li>
          <li>L&apos;export des données RH</li>
          <li>Les intégrations avec des outils tiers (calendrier iCal, webhooks, Slack)</li>
        </ul>
      </section>

      <section>
        <h2>3. Accès au service</h2>
        <h3>3.1 Conditions d&apos;accès</h3>
        <p>
          L&apos;accès à la Plateforme est réservé aux utilisateurs ayant reçu une invitation de la part d&apos;un manager ou d&apos;un administrateur d&apos;établissement. L&apos;utilisateur doit être âgé d&apos;au moins 16 ans.
        </p>

        <h3>3.2 Identifiants</h3>
        <p>
          Chaque utilisateur dispose d&apos;identifiants personnels et confidentiels. L&apos;utilisateur est seul responsable de la confidentialité de ses identifiants et de toute utilisation de son compte. Tout accès via ses identifiants est présumé effectué par lui.
        </p>

        <h3>3.3 Disponibilité</h3>
        <p>
          L&apos;Éditeur s&apos;efforce de maintenir la Plateforme accessible 24h/24 et 7j/7, sous réserve de maintenances planifiées ou d&apos;incidents techniques. Aucune garantie de disponibilité n&apos;est contractuellement engagée sauf accord spécifique (SLA).
        </p>
      </section>

      <section>
        <h2>4. Obligations de l&apos;utilisateur</h2>
        <p>L&apos;utilisateur s&apos;engage à :</p>
        <ul>
          <li>Utiliser la Plateforme conformément à sa destination et aux présentes CGU</li>
          <li>Ne pas tenter de déstabiliser, pirater ou altérer le fonctionnement de la Plateforme</li>
          <li>Ne pas collecter les données d&apos;autres utilisateurs sans autorisation</li>
          <li>Respecter la confidentialité des informations auxquelles il a accès dans le cadre de son rôle</li>
          <li>Signaler immédiatement à l&apos;Éditeur toute faille de sécurité ou utilisation frauduleuse</li>
        </ul>
      </section>

      <section>
        <h2>5. Obligations de l&apos;Éditeur</h2>
        <p>L&apos;Éditeur s&apos;engage à :</p>
        <ul>
          <li>Assurer la sécurité et la confidentialité des données conformément au RGPD</li>
          <li>Notifier les utilisateurs en cas d&apos;incident de sécurité majeur</li>
          <li>Fournir les mises à jour nécessaires au bon fonctionnement du service</li>
          <li>Donner suite aux demandes relatives aux droits des personnes (cf. Politique de confidentialité)</li>
        </ul>
      </section>

      <section>
        <h2>6. Propriété intellectuelle</h2>
        <p>
          La Plateforme Nexus, son code source, son interface et ses contenus sont la propriété exclusive de Quartz SAS. Aucune licence, droit de propriété intellectuelle ou droit d&apos;exploitation n&apos;est accordé à l&apos;utilisateur au-delà du droit d&apos;usage personnel de la Plateforme dans le cadre des présentes CGU.
        </p>
        <p>
          Les données saisies par l&apos;utilisateur (plannings, informations employés…) restent la propriété de l&apos;établissement concerné. L&apos;Éditeur n&apos;y accède qu&apos;à des fins techniques et de support.
        </p>
      </section>

      <section>
        <h2>7. Tarification et facturation</h2>
        <p>
          Les modalités tarifaires sont définies dans le contrat d&apos;abonnement conclu entre l&apos;Éditeur et l&apos;établissement client. En l&apos;absence de contrat spécifique, un tarif par défaut est communiqué lors de l&apos;activation du compte.
        </p>
      </section>

      <section>
        <h2>8. Suspension et résiliation</h2>
        <p>
          L&apos;Éditeur se réserve le droit de suspendre ou de supprimer l&apos;accès d&apos;un utilisateur en cas de violation des présentes CGU, sans préavis ni indemnité.
        </p>
        <p>
          En cas de résiliation de l&apos;abonnement, les données de l&apos;établissement sont conservées pendant 30 jours puis définitivement supprimées, sauf demande d&apos;export préalable.
        </p>
      </section>

      <section>
        <h2>9. Responsabilité</h2>
        <p>
          L&apos;Éditeur ne peut être tenu responsable des dommages indirects (pertes d&apos;exploitation, perte de données, manque à gagner) résultant de l&apos;utilisation ou de l&apos;indisponibilité de la Plateforme.
        </p>
        <p>
          La responsabilité de l&apos;Éditeur est limitée au montant total des sommes versées par l&apos;établissement au cours des 12 derniers mois précédant le sinistre.
        </p>
      </section>

      <section>
        <h2>10. Modifications des CGU</h2>
        <p>
          Quartz SAS se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs sont informés par email des modifications substantielles au moins 15 jours avant leur entrée en vigueur. La poursuite de l&apos;utilisation de la Plateforme après cette date vaut acceptation des nouvelles conditions.
        </p>
      </section>

      <section>
        <h2>11. Droit applicable et juridiction compétente</h2>
        <p>
          Les présentes CGU sont régies exclusivement par le droit français. En cas de litige, les parties s&apos;engagent à rechercher une solution amiable dans un délai de 30 jours. À défaut, le litige sera soumis aux tribunaux compétents du ressort du siège social de Quartz SAS.
        </p>
      </section>
    </article>
  )
}
