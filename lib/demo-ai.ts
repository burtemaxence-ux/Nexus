// Simulation de l'assistant IA pour les comptes de démonstration.
//
// Pourquoi : la démo est publique. Brancher un visiteur anonyme sur l'API
// Anthropic reviendrait à laisser n'importe qui consommer des crédits payés.
// Les réponses ci-dessous sont donc pré-écrites, mais diffusées exactement
// comme les vraies (flux de texte, même cadence, même rendu Markdown) : côté
// interface, rien ne distingue la démo de la production.
//
// La génération de planning, elle, n'est PAS simulée : le solveur déterministe
// de `lib/planning/solver` calcule un vrai planning conforme, gratuitement.
// Voir app/api/ai/plan/route.ts.

type Reply = { match: RegExp; text: string }

const MANAGER_REPLIES: Reply[] = [
  {
    match: /conform|légal|loi|code du travail|infraction|repos|amplitude/i,
    text: `J'ai repassé la semaine au crible des **17 règles** du Code du travail. Deux points ressortent :

**1. Repos quotidien — Benoît Dupont** (Art. L3131-1)
Vendredi il termine à 13h00 et reprend samedi à 04h00 : **15h de repos**, c'est conforme. En revanche, si vous avancez son service de vendredi à 05h00–14h00, on tombe à 14h — toujours au-dessus des 11h légales, donc ça passe.

**2. Amplitude — Élise Petit**, samedi
08h00 → 15h00 avec la coupure prévue : amplitude de 7h, aucun souci.

**Le point de vigilance réel** : Camille Bernard est à **25h planifiées pour un contrat de 24h**. Une heure complémentaire, c'est licite, mais elle doit être majorée. Je peux la basculer sur Élise, qui a encore 6h de marge.`,
  },
  {
    match: /coût|cout|budget|masse salariale|€|euro|marge|rentab/i,
    text: `Sur la semaine du 27 juillet :

| | |
|---|---|
| Heures planifiées | **178h30** |
| Coût salarial brut | **2 473 €** |
| Heures supplémentaires | 0h |
| Couverture des besoins | 100 % |

Le poste **Fournil** pèse 41 % du total à lui seul — c'est normal en boulangerie, les heures de nuit sont incompressibles.

**Là où il y a de la marge** : samedi vous êtes à 43h30 planifiées, contre 20h le mercredi. Si l'affluence du mercredi ne le justifie pas, décaler un service de vente du samedi vers le mercredi lisserait la semaine sans toucher au volume total ni au coût.`,
  },
  {
    match: /remplac|absent|malade|congé|conges|indispo/i,
    text: `Pour remplacer un service, je regarde quatre choses dans l'ordre : les **disponibilités déclarées**, le **repos légal** de chacun, les **heures contractuelles** déjà atteintes, et la **compétence sur le poste**.

Sur le service de vente de jeudi 13h00–19h30, voici le classement :

1. **Élise Petit** — disponible, 24h planifiées sur 30h contractuelles, repos respecté. *Meilleur choix.*
2. **Alice Martin** — disponible, mais passerait à 40h30 : heures supplémentaires à la clé.
3. **Camille Bernard** — déjà au-delà de son contrat de 24h, je ne la propose pas.

Je peux lui envoyer la proposition, elle recevra une notification et pourra accepter depuis son téléphone.`,
  },
  {
    match: /planning|semaine|génér|generer|organis/i,
    text: `La semaine est complète : **178h30 sur 6 salariés**, tous les besoins couverts.

La structure retenue suit vos contraintes d'ouverture :
- **Fournil** à partir de 04h00 — Benoît en semaine, Hugo le week-end
- **Pâtisserie** à 05h00 — David, cinq jours sur sept
- **Vente** en deux services, 06h30 et 13h00, avec un renfort le samedi

Aucune infraction détectée, et personne n'est en heures supplémentaires. Si vous voulez que je resserre le samedi — c'est le jour le plus chargé à 43h30 — dites-le-moi et je vous propose une variante.`,
  },
]

const EMPLOYEE_REPLIES: Reply[] = [
  {
    match: /planning|horaire|semaine|travaill|quand/i,
    text: `Voici vos services de la semaine :

- **Lundi** 06h30 – 13h30 · Vente
- **Mardi** 06h30 – 13h30 · Vente
- **Mercredi** 06h30 – 13h30 · Vente
- **Vendredi** 06h30 – 14h00 · Vente
- **Samedi** 06h30 – 14h00 · Vente

Soit **33h30** cette semaine, pour un contrat de 35h. Jeudi et dimanche sont vos jours de repos.`,
  },
  {
    match: /congé|conges|vacance|absence|repos|poser/i,
    text: `Votre solde estimé est de **12,5 jours** de congés payés.

Pour poser une demande : onglet **Congés**, puis « Nouvelle demande ». Vous choisissez les dates, le motif, et votre manager reçoit une notification immédiatement. Vous êtes prévenu dès qu'il répond.

À savoir : si les dates demandées tombent sur des services déjà planifiés, la demande le signale — ça évite les allers-retours.`,
  },
  {
    match: /pointage|badge|pointer|arrivée|arrivee|départ|depart|retard/i,
    text: `Le pointage se fait depuis l'onglet **Pointage**, avec votre code PIN à 4 chiffres.

Vous pointez votre arrivée en début de service, votre départ à la fin. Si vous oubliez, l'application le détecte le soir même et prévient votre manager — inutile de vous inquiéter, ça se régularise.

Vos heures pointées sont comparées aux heures planifiées : c'est ce qui sert de base au récapitulatif que vous recevez chaque vendredi.`,
  },
  {
    match: /échange|echange|permut|collègue|collegue|swap/i,
    text: `Vous pouvez proposer un de vos services à l'équipe depuis l'onglet **Échanges**.

Le fonctionnement : vous publiez le service, vos collègues le voient et peuvent se positionner. Votre manager valide, et le planning se met à jour tout seul pour tout le monde.

L'application ne propose votre service qu'aux collègues qui **peuvent légalement le prendre** — repos suffisant, heures contractuelles non dépassées. Ça évite de créer une infraction en rendant service.`,
  },
]

const MANAGER_FALLBACK = `Je suis l'assistant de votre établissement. J'ai accès au planning de la semaine, aux contrats, aux disponibilités déclarées et aux 17 règles de conformité.

Vous pouvez me demander par exemple :
- « Est-ce que ma semaine est conforme ? »
- « Combien me coûte ce planning ? »
- « Qui peut remplacer Alice jeudi ? »`

const EMPLOYEE_FALLBACK = `Je suis votre assistant. Je peux vous renseigner sur vos horaires, vos congés, votre pointage et les échanges de services.

Essayez par exemple :
- « Quels sont mes horaires cette semaine ? »
- « Combien de congés il me reste ? »
- « Comment j'échange un service ? »`

export function demoReply(message: string, mode: 'manager' | 'employee'): string {
  const table = mode === 'manager' ? MANAGER_REPLIES : EMPLOYEE_REPLIES
  const hit = table.find(r => r.match.test(message))
  if (hit) return hit.text
  return mode === 'manager' ? MANAGER_FALLBACK : EMPLOYEE_FALLBACK
}

/**
 * Diffuse la réponse mot à mot, au rythme d'un vrai modèle. Le composant de
 * chat ne fait aucune différence : il consomme un flux de texte dans les deux
 * cas.
 */
export function demoStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const chunks = text.match(/\S+\s*/g) ?? [text]
  let i = 0

  return new ReadableStream({
    async pull(controller) {
      if (i >= chunks.length) {
        controller.close()
        return
      }
      // Cadence proche d'un flux réel, avec une latence initiale de réflexion.
      await new Promise(r => setTimeout(r, i === 0 ? 420 : 18 + Math.random() * 22))
      controller.enqueue(encoder.encode(chunks[i++]))
    },
  })
}
