import type { TourStep } from './product-tour'

// Parcours destinés à un ACQUÉREUR, pas à un utilisateur qui découvre l'outil.
// La différence est nette : on ne montre pas « comment faire », on montre ce
// qui a de la valeur et pourquoi c'est coûteux à refaire. D'où la ligne de
// conclusion sur les étapes qui portent un argument.

export const MANAGER_TOUR: TourStep[] = [
  {
    title: 'Vous êtes dans le produit réel',
    body: "Pas une maquette, pas un enregistrement : l'application elle-même, en production, sur un établissement de démonstration de 8 salariés. Tout est cliquable, tout est modifiable.",
    takeaway: 'Cinq minutes suffisent à en faire le tour. Rien de ce que vous ferez ici n’a de conséquence.',
  },
  {
    route: '/manager',
    selector: 'nav a[href="/manager/planning"]',
    pad: 6,
    title: 'Le périmètre fonctionnel',
    body: 'Planning, pointage, congés, échanges de services, remplacements, conformité, alertes, rapports, analytique, journal d’audit. Treize modules, tous branchés sur la même base.',
    takeaway: 'C’est un produit fini, pas un prototype : 63 pages et 99 routes d’API en production.',
  },
  {
    route: '/manager/planning',
    selector: '[data-tour="metrics"]',
    title: 'Les chiffres que regarde un gérant',
    body: 'Heures planifiées, heures travaillées, heures supplémentaires, taux de couverture — et surtout le coût salarial brut de la semaine, calculé depuis les taux horaires par poste.',
    takeaway: 'Le coût en euros est ce que les concurrents affichent le plus mal. C’est la première question d’un patron de restaurant.',
  },
  {
    route: '/manager/planning',
    selector: '[data-tour="verify"]',
    pad: 6,
    title: 'Le cœur de l’actif',
    body: 'Ce bouton passe la semaine au crible de 17 règles du Code du travail : repos quotidien et hebdomadaire, durées maximales, amplitude, pauses, coupures des temps partiels, travail de nuit et du dimanche, et cinq règles propres aux mineurs.',
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
    body: 'Chaque alerte cite la référence légale qui la fonde et propose une correction. C’est ce qui transforme un outil de planning en outil de protection contre les prud’hommes.',
    takeaway: 'Le module est autonome : 674 lignes, aucune dépendance externe, intégrable ailleurs en copiant deux fichiers.',
  },
  {
    route: '/manager/employees',
    title: 'L’équipe et les contrats',
    body: 'Dossiers salariés, contrats, taux horaires, disponibilités déclarées. C’est cette matière qui alimente à la fois le calcul du coût et le contrôle de conformité.',
  },
  {
    route: '/manager',
    selector: 'nav a[href="/manager/rapport"]',
    pad: 6,
    title: 'Ce qui sort vers la paie',
    body: 'Récapitulatifs PDF, flux iCal pour les agendas, et une déclaration sociale nominative mensuelle au format NEODeS, pré-remplie pour le comptable.',
    takeaway: 'La DSN est un format administratif ingrat et mal documenté. C’est plusieurs jours de travail que le repreneur n’a pas à refaire.',
  },
  {
    title: 'À vous',
    body: 'Créez un service en cliquant une case vide, glissez-le d’un jour à l’autre, lancez une vérification de conformité, interrogez l’assistant. Le bandeau en bas à gauche vous fait basculer côté salarié à tout moment.',
    takeaway: 'Le même produit, vu par un employé : c’est là que se joue l’adoption sur le terrain.',
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
