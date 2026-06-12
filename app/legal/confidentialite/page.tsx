import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Quartzbase',
}

export default function ConfidentialitePage() {
  return (
    <article className="prose-legal">
      <h1>Politique de confidentialité</h1>
      <p className="updated">Dernière mise à jour : 25 mai 2025</p>

      <section>
        <h2>1. Responsable du traitement</h2>
        <p>
          Le responsable du traitement des données personnelles collectées via la Plateforme Quartzbase est :
        </p>
        <ul>
          <li><strong>Quartz SAS</strong>, Paris, France</li>
          <li><strong>Email DPO :</strong> <a href="mailto:assistance.quartzbase@mail.fr">assistance.quartzbase@mail.fr</a></li>
        </ul>
      </section>

      <section>
        <h2>2. Données collectées</h2>
        <p>Dans le cadre de l&apos;utilisation de la Plateforme, nous collectons les catégories de données suivantes :</p>

        <h3>2.1 Données d&apos;identification</h3>
        <ul>
          <li>Nom, prénom</li>
          <li>Adresse e-mail professionnelle</li>
          <li>Numéro de téléphone (optionnel)</li>
          <li>Poste et type de contrat</li>
        </ul>

        <h3>2.2 Données de gestion RH</h3>
        <ul>
          <li>Plannings et horaires de travail</li>
          <li>Enregistrements de présence (pointages)</li>
          <li>Demandes de congés et absences</li>
          <li>Retards et justifications associées</li>
          <li>Contrats et dates d&apos;échéance</li>
        </ul>

        <h3>2.3 Données techniques</h3>
        <ul>
          <li>Adresse IP</li>
          <li>Données de connexion et logs d&apos;accès</li>
          <li>Préférences d&apos;interface (thème)</li>
        </ul>
      </section>

      <section>
        <h2>3. Finalités et bases légales</h2>
        <table>
          <thead>
            <tr>
              <th>Finalité</th>
              <th>Base légale</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Gestion de la relation employeur-employé (planning, présences, congés)</td>
              <td>Exécution du contrat (Art. 6.1.b RGPD)</td>
            </tr>
            <tr>
              <td>Conformité légale (droit du travail, obligations sociales)</td>
              <td>Obligation légale (Art. 6.1.c RGPD)</td>
            </tr>
            <tr>
              <td>Amélioration de la Plateforme, sécurité, logs techniques</td>
              <td>Intérêt légitime (Art. 6.1.f RGPD)</td>
            </tr>
            <tr>
              <td>Envoi de notifications par email (planning, alertes)</td>
              <td>Exécution du contrat (Art. 6.1.b RGPD)</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>4. Durée de conservation</h2>
        <ul>
          <li><strong>Données RH actives :</strong> durée de la relation contractuelle + 5 ans (prescription de droit commun)</li>
          <li><strong>Bulletins de salaire et documents de paie :</strong> 5 ans</li>
          <li><strong>Données de présence et pointages (badgeuse) :</strong> 3 ans</li>
          <li><strong>Logs techniques et journal d&apos;audit :</strong> 12 mois glissants</li>
          <li><strong>Données d&apos;un employé archivé :</strong> 3 ans après archivage, puis suppression automatique</li>
        </ul>
      </section>

      <section>
        <h2>5. Destinataires des données</h2>
        <p>Les données personnelles sont accessibles aux personnes suivantes :</p>
        <ul>
          <li><strong>Équipe Quartz SAS</strong> — administration technique de la Plateforme</li>
          <li><strong>Managers et superviseurs</strong> de votre établissement — dans le cadre de leurs missions</li>
          <li><strong>L&apos;employé concerné</strong> — pour ses propres données (planning, congés, présences)</li>
        </ul>
        <p>Nous faisons appel aux sous-traitants suivants :</p>
        <ul>
          <li><strong>Supabase Inc.</strong> — stockage des données (serveurs en région UE, eu-west-3 Paris)</li>
          <li><strong>Vercel Inc.</strong> — hébergement de l&apos;application (340 Pine Street, San Francisco)</li>
          <li><strong>Anthropic PBC</strong> — traitement IA (génération de planning, assistant RH) — données anonymisées, non stockées</li>
          <li><strong>Resend Inc.</strong> — envoi des emails transactionnels</li>
        </ul>
        <p>Aucune donnée n&apos;est vendue ni cédée à des tiers à des fins commerciales.</p>
      </section>

      <section>
        <h2>6. Transferts hors UE</h2>
        <p>
          Certains sous-traitants (Vercel, Resend, Anthropic) sont établis aux États-Unis. Ces transferts sont encadrés par des clauses contractuelles types (CCT) approuvées par la Commission européenne, conformément à l&apos;article 46 du RGPD. Les données transmises à Anthropic pour les fonctions IA sont limitées au strict nécessaire et ne sont pas conservées à des fins d&apos;entraînement.
        </p>
      </section>

      <section>
        <h2>7. Vos droits</h2>
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul>
          <li><strong>Droit d&apos;accès</strong> (Art. 15) — obtenir une copie de vos données</li>
          <li><strong>Droit de rectification</strong> (Art. 16) — corriger des données inexactes</li>
          <li><strong>Droit à l&apos;effacement</strong> (Art. 17) — demander la suppression de vos données</li>
          <li><strong>Droit à la portabilité</strong> (Art. 20) — recevoir vos données dans un format structuré</li>
          <li><strong>Droit d&apos;opposition</strong> (Art. 21) — vous opposer à certains traitements</li>
          <li><strong>Droit à la limitation</strong> (Art. 18) — restreindre temporairement un traitement</li>
        </ul>
        <p>
          Pour exercer ces droits, contactez notre DPO à <a href="mailto:assistance.quartzbase@mail.fr">assistance.quartzbase@mail.fr</a>. Nous répondons dans un délai maximum de <strong>30 jours</strong>.
        </p>
        <p>
          En cas de réponse insatisfaisante, vous pouvez introduire une réclamation auprès de la <strong>CNIL</strong> (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>).
        </p>
      </section>

      <section>
        <h2>8. Sécurité</h2>
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement TLS en transit, chiffrement au repos, authentification sécurisée via JWT, contrôle d&apos;accès basé sur les rôles (RLS Supabase), sauvegardes régulières.
        </p>
      </section>

      <section>
        <h2>9. Modifications</h2>
        <p>
          Quartz SAS se réserve le droit de modifier la présente politique à tout moment. Toute modification substantielle sera notifiée par email aux utilisateurs actifs au moins 15 jours avant son entrée en vigueur.
        </p>
      </section>
    </article>
  )
}
