import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mentions légales — Nexus',
}

export default function MentionsLegalesPage() {
  return (
    <article className="prose-legal">
      <h1>Mentions légales</h1>
      <p className="updated">Dernière mise à jour : 25 mai 2025</p>

      <section>
        <h2>1. Éditeur du site</h2>
        <p>
          Le site <strong>Nexus</strong> (ci-après « la Plateforme ») est édité par :
        </p>
        <ul>
          <li><strong>Raison sociale :</strong> Quartz SAS</li>
          <li><strong>Forme juridique :</strong> Société par Actions Simplifiée (SAS)</li>
          <li><strong>Capital social :</strong> 1 000 €</li>
          <li><strong>SIRET :</strong> En cours d&apos;immatriculation</li>
          <li><strong>N° TVA intracommunautaire :</strong> Non applicable (immatriculation en cours)</li>
          <li><strong>Siège social :</strong> Paris, France</li>
          <li><strong>Email :</strong> <a href="mailto:contact@quartz.fr">contact@quartz.fr</a></li>
        </ul>
      </section>

      <section>
        <h2>2. Directeur de la publication</h2>
        <p>
          Le directeur de la publication est le représentant légal de Quartz SAS, en qualité de Président.
        </p>
      </section>

      <section>
        <h2>3. Hébergement</h2>
        <p>La Plateforme est hébergée par :</p>
        <ul>
          <li><strong>Société :</strong> Vercel Inc.</li>
          <li><strong>Adresse :</strong> 340 Pine Street Suite 701, San Francisco, CA 94104, États-Unis</li>
          <li><strong>Site web :</strong> vercel.com</li>
        </ul>
        <p>Les données sont stockées sur l&apos;infrastructure Supabase (Supabase Inc., San Francisco, CA, États-Unis), hébergée en région <strong>eu-west-3 (Paris, France)</strong> conformément aux exigences du RGPD.</p>
      </section>

      <section>
        <h2>4. Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des éléments constituant la Plateforme Nexus (code source, interface graphique, textes, logos, icônes, architecture) est la propriété exclusive de Quartz SAS ou de ses partenaires et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
        </p>
        <p>
          Toute reproduction, représentation, modification, publication ou transmission partielle ou totale des contenus de la Plateforme, par quelque procédé que ce soit, est interdite sans l&apos;autorisation préalable écrite de Quartz SAS.
        </p>
      </section>

      <section>
        <h2>5. Limitation de responsabilité</h2>
        <p>
          Quartz SAS met tout en œuvre pour assurer la disponibilité et l&apos;exactitude des informations diffusées sur la Plateforme. Toutefois, Quartz SAS ne peut garantir l&apos;exactitude, la complétude, l&apos;actualité des informations diffusées et décline toute responsabilité pour toute imprécision, inexactitude ou omission.
        </p>
        <p>
          Quartz SAS ne peut être tenue responsable des dommages directs ou indirects causés à l&apos;utilisateur lors de l&apos;accès à la Plateforme, incluant les pertes de données, les interruptions de service ou les attaques informatiques.
        </p>
      </section>

      <section>
        <h2>6. Droit applicable</h2>
        <p>
          Les présentes mentions légales sont régies par le droit français. Tout litige relatif à leur interprétation ou exécution relève de la compétence exclusive des tribunaux français.
        </p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>
          Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter à l&apos;adresse suivante :{' '}
          <a href="mailto:legal@quartz.fr">legal@quartz.fr</a>
        </p>
      </section>
    </article>
  )
}
