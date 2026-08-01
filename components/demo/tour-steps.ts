import type { TourStep } from './product-tour'

// Parcours destinés à un ACQUÉREUR, pas à un utilisateur qui découvre l'outil.
// La différence est nette : on ne montre pas « comment faire », on montre ce
// qui a de la valeur et pourquoi c'est coûteux à refaire. D'où la ligne de
// conclusion sur les étapes qui portent un argument.

export const MANAGER_TOUR: TourStep[] = [
  {
    title: 'Vous êtes dans le produit réel',
    body: "Pas une maquette, pas un enregistrement : l'application elle-même, en production, sur un établissement de démonstration de 8 salariés. Tout est cliquable, tout est modifiable.",
    takeaway: 'Comptez dix minutes pour le parcours complet. Vous pouvez le quitter à tout moment, et le reprendre depuis le bandeau en bas à gauche.',
  },
  {
    route: '/manager',
    title: 'L’écran d’ouverture',
    body: 'Qui est en poste à cet instant, la charge de la semaine, et ce qui reste à traiter — publier le planning, vérifier les pointages du service. Le gérant sait ce qui l’attend sans ouvrir un seul module.',
    takeaway: 'Une liste de tâches calculée depuis l’état réel des données, pas un tableau de bord décoratif.',
  },
  {
    route: '/manager',
    selector: 'nav a[href="/manager/planning"]',
    pad: 6,
    title: 'Le périmètre fonctionnel',
    body: 'Planning, pointage, congés, échanges de services, remplacements, marketplace, conformité, alertes, rapports, analytique, journal d’audit — plus les réglages de l’établissement. Treize modules, tous branchés sur la même base.',
    takeaway: 'C’est un produit fini, pas un prototype : 63 pages et 100 routes d’API en production.',
  },
  {
    route: '/manager/planning',
    title: 'Construire la semaine',
    body: 'Un clic sur une case vide crée un service, un glisser-déposer le change de jour ou de salarié. La semaine reste en brouillon tant qu’elle n’est pas publiée : l’équipe ne voit rien avant, et un planning en cours de réflexion ne circule jamais.',
    takeaway: 'Brouillon puis publication : la distinction paraît anodine, c’est celle qui fait accepter ou rejeter l’outil par une équipe.',
  },
  {
    route: '/manager/planning',
    selector: '[data-tour="metrics"]',
    title: 'Les chiffres que regarde un gérant',
    body: 'Heures planifiées, heures travaillées, heures supplémentaires, taux de couverture — et surtout le coût salarial brut de la semaine, calculé depuis les taux horaires par poste : ici 12 € pour la vente, 16 € pour la responsable.',
    takeaway: 'Le coût en euros est ce que les concurrents affichent le plus mal. C’est la première question d’un patron de restaurant.',
  },
  {
    route: '/manager/planning',
    selector: '[data-tour="verify"]',
    pad: 6,
    title: 'Le cœur de l’actif',
    body: 'Ce bouton passe la semaine au crible de 17 règles du Code du travail : repos quotidien et hebdomadaire, durées maximales par jour, par semaine et en moyenne, amplitude, pauses, jours consécutifs, coupures des temps partiels, travail de nuit et du dimanche, heures contractuelles, et cinq règles propres aux mineurs.',
    takeaway: 'Générer 17 règles plausibles est facile aujourd’hui. Savoir lesquelles sont justes, et l’avoir figé dans des tests, ne l’est pas.',
  },
  {
    route: '/manager/planning',
    selector: '[data-tour="generate"]',
    pad: 6,
    title: 'La génération sous contraintes',
    body: 'Le solveur construit une semaine complète en respectant les disponibilités déclarées, les besoins par poste, les repos légaux et les heures contractuelles. Déterministe et instantané — conforme par construction, pas par vérification a posteriori.',
    takeaway: 'Un moteur d’IA est branché en option ; le solveur, lui, ne coûte rien à l’exécution.',
  },
  {
    route: '/manager/compliance',
    title: 'Les infractions, article par article',
    body: 'Les anomalies relevées sur les plannings, chacune rattachée au salarié concerné et à la règle qui la fonde, avec la correction proposée. Sur cet établissement, ce sont les dépassements d’heures contractuelles qui ressortent.',
    takeaway: 'Le module est autonome : 674 lignes, aucune dépendance externe, intégrable ailleurs en copiant deux fichiers.',
  },
  {
    route: '/manager/presences',
    title: 'Les heures réellement faites',
    body: 'Chaque salarié pointe arrivée et départ depuis son téléphone, avec un code à quatre chiffres chiffré en base. L’écran met en regard l’heure planifiée et l’heure pointée, signale les retards, et marque les durées anormales que le contrôle de 23 h identifie comme oublis probables.',
    takeaway: 'C’est l’écart planifié / pointé qui alimente la paie. Sans lui, un logiciel de planning n’est qu’un agenda partagé.',
  },
  {
    route: '/manager/conges',
    title: 'Les congés',
    body: 'Les demandes arrivent ici, triées par statut. Acceptation ou refus en un clic, avec un commentaire transmis au salarié, qui suit son solde estimé de son côté sans avoir à le demander.',
    takeaway: 'Circuit complet demande → décision → notification : c’est ce qui remplace vraiment les SMS et les demandes perdues.',
  },
  {
    route: '/manager/echanges',
    title: 'Les échanges de services',
    body: 'Un salarié propose un de ses services, un collègue se positionne, le gérant tranche. Rien ne bouge dans le planning sans cette validation — et un service n’est proposé qu’aux collègues qui peuvent légalement le prendre.',
    takeaway: 'Rendre service ne doit pas créer une infraction : la conformité est vérifiée sur les échanges aussi, pas seulement sur le planning initial.',
  },
  {
    route: '/manager/replacements',
    title: 'Couvrir une absence de dernière minute',
    body: 'Un service à pourvoir déclenche une recherche : les candidats sont classés avec un score et le motif du classement — disponible et repos respecté, ou déjà au-delà de ses heures contractuelles. La demande expire d’elle-même la veille au soir. Le module Marketplace, juste à côté, publie le créneau plus largement si personne ne répond.',
    takeaway: 'Le délai moyen de confirmation est mesuré et affiché : la promesse commerciale se vérifie dans le produit.',
  },
  {
    route: '/manager/alertes',
    title: 'Ce qui remonte tout seul',
    body: 'Un point unique où arrivent les anomalies de conformité et les échéances contractuelles — fins de CDD, périodes d’essai qui arrivent à terme — classées en critique, avertissement et information.',
    takeaway: 'Les échéances de contrat sont ce qu’un gérant oublie, et ce qu’un contrôle regarde en premier.',
  },
  {
    route: '/manager/employees',
    title: 'L’équipe et les contrats',
    body: 'Huit salariés en CDI 35 h, CDI 28 h, CDD et Extra — les quatre formes qu’on rencontre réellement en restauration. Chaque dossier porte le contrat, le taux horaire, la période d’essai et les disponibilités déclarées.',
    takeaway: 'C’est cette matière qui alimente à la fois le calcul du coût, le contrôle de conformité et la génération du planning.',
  },
  {
    route: '/manager/analytics',
    title: 'Ce que ça raconte sur la durée',
    body: 'Masse salariale, présence, absences et turnover sur la période choisie, avec le repérage des situations chroniques : les retards répétés, les absences récurrentes, salarié par salarié.',
    takeaway: 'Ce module ne sert pas à faire le planning, il sert à justifier une décision RH. C’est ce qui fait garder l’outil au-delà du premier mois.',
  },
  {
    route: '/manager/rapport',
    title: 'Ce qui sort vers la paie',
    body: 'Récapitulatifs PDF, flux iCal pour les agendas, et une déclaration sociale nominative mensuelle au format NEODeS, pré-remplie pour le comptable. L’écran suit aussi le coût de la main-d’œuvre rapporté au chiffre d’affaires.',
    takeaway: 'La DSN est un format administratif ingrat et mal documenté. C’est plusieurs jours de travail que le repreneur n’a pas à refaire.',
  },
  {
    selector: '[data-tour="assistant"]',
    title: 'Nina, l’assistante intégrée',
    body: 'Elle reçoit à chaque question l’état complet de l’établissement — équipe, contrats, congés, retards, services passés et à venir. Elle rédige les documents RH avec leur base légale (avertissement, convocation, attestation) et propose des actions à confirmer : valider un congé, créer un créneau, inviter un salarié, copier une semaine.',
    takeaway: 'En démonstration ses réponses sont pré-écrites — brancher un visiteur anonyme sur une clé API payante serait imprudent. Le circuit réel est dans app/api/ai/chat. La génération de planning, elle, n’est pas simulée.',
  },
  {
    route: '/manager/settings',
    title: 'Le paramétrage',
    body: 'Postes et coûts horaires, règles de planning, contrats et convention collective, intégrations — API REST en lecture seule, webhooks compatibles Zapier, Make et n8n, Slack, abonnement iCal —, exports, RGPD, parrainage, facturation.',
    takeaway: 'Chaque établissement se règle sans toucher au code. C’est ce qui sépare un produit vendable d’une application faite pour un seul client.',
  },
  {
    route: '/manager/planning',
    title: 'À vous',
    body: 'Créez un service en cliquant une case vide, glissez-le d’un jour à l’autre, lancez une vérification de conformité, interrogez Nina. Rien n’a de conséquence : les données sont fictives, remises à zéro chaque nuit, et aucune action ne déclenche d’envoi réel.',
    takeaway: 'Le bandeau en bas à gauche vous fait basculer côté salarié — c’est là que se joue l’adoption sur le terrain.',
  },
]

export const EMPLOYEE_TOUR: TourStep[] = [
  {
    title: 'L’autre moitié du produit',
    body: 'Voici exactement ce que voit un salarié : même application, mêmes droits qu’en production, données de démonstration. Un outil de planning ne vaut que si l’équipe l’ouvre vraiment.',
    takeaway: 'C’est le côté que les démonstrations de ce marché montrent rarement.',
  },
  {
    route: '/employee/planning',
    title: 'Ses horaires',
    body: 'Le salarié voit sa semaine dès que le manager publie le planning — et rien avant, pour qu’un brouillon en cours ne circule jamais. Consultable hors ligne, installable sur le téléphone comme une application.',
    takeaway: 'Aucun magasin d’applications à passer : c’est une application web installable, donc rien à maintenir côté mobile.',
  },
  {
    route: '/employee/badgeuse',
    title: 'Le pointage',
    body: 'Arrivée et départ pointés depuis le téléphone avec un code personnel à quatre chiffres, chiffré en base. Les oublis sont détectés automatiquement le soir même et remontés au manager.',
    takeaway: 'Les heures pointées se comparent aux heures planifiées : c’est ce qui alimente les écarts et la paie.',
  },
  {
    route: '/employee/conges',
    title: 'Les congés',
    body: 'Demande en deux clics, solde estimé, réponse du manager notifiée. Le circuit complet remplace les SMS et les demandes perdues.',
  },
  {
    route: '/employee/echanges',
    title: 'Les échanges de services',
    body: 'Un salarié propose un service à l’équipe, un collègue le reprend, le manager valide, le planning se met à jour pour tout le monde.',
    takeaway: 'Un service n’est proposé qu’aux collègues qui peuvent légalement le prendre — repos suffisant, heures contractuelles non dépassées. Rendre service ne crée pas d’infraction.',
  },
  {
    title: 'Voilà le produit entier',
    body: 'Le bandeau en bas à gauche vous ramène côté manager quand vous voulez. Le dossier technique complet — audit, architecture, runbook d’exploitation — est fourni avec la cession.',
    takeaway: 'Des questions ? maxence.burte@gmail.com',
  },
]
