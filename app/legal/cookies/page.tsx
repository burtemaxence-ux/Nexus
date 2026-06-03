import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de cookies — Nexus',
}

export default function CookiesPage() {
  return (
    <article className="prose-legal">
      <h1>Politique de cookies</h1>
      <p className="updated">Dernière mise à jour : 25 mai 2025</p>

      <section>
        <h2>1. Qu&apos;est-ce qu&apos;un cookie ?</h2>
        <p>
          Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de votre visite sur un site web. Il permet au site de mémoriser certaines informations vous concernant afin d&apos;améliorer votre expérience et de sécuriser votre session.
        </p>
      </section>

      <section>
        <h2>2. Cookies utilisés par Nexus</h2>

        <h3>2.1 Cookies strictement nécessaires</h3>
        <p>
          Ces cookies sont indispensables au fonctionnement de la Plateforme. Ils ne peuvent pas être désactivés.
        </p>
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Émetteur</th>
              <th>Finalité</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>sb-[ref]-auth-token</code></td>
              <td>Supabase</td>
              <td>Gestion de la session d&apos;authentification</td>
              <td>Session / 7 jours (remember me)</td>
            </tr>
            <tr>
              <td><code>sb-[ref]-auth-token-code-verifier</code></td>
              <td>Supabase</td>
              <td>Sécurisation du flux d&apos;authentification (PKCE)</td>
              <td>Session</td>
            </tr>
          </tbody>
        </table>

        <h3>2.2 Cookies de préférences</h3>
        <p>
          Ces cookies mémorisent vos préférences d&apos;interface. Ils n&apos;impliquent aucun suivi et ne partagent aucune donnée avec des tiers.
        </p>
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Émetteur</th>
              <th>Finalité</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>dp-theme</code></td>
              <td>Nexus (localStorage)</td>
              <td>Mémorisation du thème choisi (clair / sombre)</td>
              <td>Persistant (localStorage)</td>
            </tr>
            <tr>
              <td><code>nexus-onboarding-step</code></td>
              <td>Nexus (localStorage)</td>
              <td>Progression du tutoriel de démarrage</td>
              <td>Jusqu&apos;à la fin du tutoriel (suppression automatique)</td>
            </tr>
          </tbody>
        </table>

        <h3>2.3 Cookies analytiques</h3>
        <p>
          À ce jour, la Plateforme Nexus <strong>n&apos;utilise pas de cookies analytiques ou publicitaires</strong>. Aucun outil de tracking tiers (Google Analytics, Hotjar, Mixpanel…) n&apos;est déployé.
        </p>
        <p>
          Si cela venait à changer, cette politique serait mise à jour et votre consentement explicite serait recueilli conformément aux recommandations de la CNIL.
        </p>
      </section>

      <section>
        <h2>3. Cookies tiers</h2>
        <p>
          Dans le cadre de l&apos;hébergement et des fonctionnalités de la Plateforme, certains prestataires techniques peuvent déposer leurs propres cookies :
        </p>
        <ul>
          <li>
            <strong>Vercel</strong> — peut déposer des cookies techniques liés à la distribution des pages (CDN). Ces cookies sont strictement nécessaires et ne permettent pas de suivi personnel.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Gestion de vos cookies</h2>
        <p>
          Conformément aux recommandations de la CNIL, les cookies strictement nécessaires au fonctionnement de la Plateforme ne nécessitent pas votre consentement. Les cookies de préférences sont activés uniquement à votre initiative (changement de thème).
        </p>
        <p>
          Vous pouvez à tout moment paramétrer votre navigateur pour refuser ou supprimer les cookies. Voici comment procéder selon votre navigateur :
        </p>
        <ul>
          <li><strong>Chrome :</strong> Paramètres → Confidentialité et sécurité → Cookies</li>
          <li><strong>Firefox :</strong> Paramètres → Vie privée et sécurité → Cookies</li>
          <li><strong>Safari :</strong> Préférences → Confidentialité → Cookies</li>
          <li><strong>Edge :</strong> Paramètres → Confidentialité, recherche et services → Cookies</li>
        </ul>
        <p>
          Attention : la désactivation des cookies strictement nécessaires empêchera votre connexion à la Plateforme.
        </p>
      </section>

      <section>
        <h2>5. Contact</h2>
        <p>
          Pour toute question relative à notre utilisation des cookies, vous pouvez contacter notre DPO à l&apos;adresse :{' '}
          <a href="mailto:assistance.quartzbase@mail.fr">assistance.quartzbase@mail.fr</a>
        </p>
        <p>
          Vous avez également le droit de déposer une réclamation auprès de la <strong>CNIL</strong> sur{' '}
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.
        </p>
      </section>
    </article>
  )
}
