# `lib/compliance` — moteur de conformité au droit du travail français

Analyse un planning et remonte les infractions au Code du travail, règle par règle, avec
l'article applicable et une suggestion de correction.

**17 règles implémentées. Les 17 couvertes par des tests. 57 tests sur ce seul module.**

---

## Évaluer ce module en 10 minutes

C'est le point le plus important de ce fichier : **le moteur ne dépend de rien.**

```bash
npm test lib/compliance     # 57 tests, ~4 s
```

`rules.ts` — 674 lignes, les 17 règles, le moteur complet — **n'a aucun `import`.**
Pas de Supabase, pas de Next.js, pas de bibliothèque tierce, pas même une dépendance de
dates. TypeScript pur, fonctions pures, aucun effet de bord.

Pour l'intégrer ailleurs : **copier deux fichiers.**

| Fichier | Lignes | Dépendances | Rôle |
|---|---:|---|---|
| `rules.ts` | 674 | **aucune** | Le moteur et les 17 règles |
| `config.ts` | 83 | `./rules` (types) | Activation d'alertes par convention collective |
| `persist.ts` | 196 | Supabase, notifications | **Le seul fichier couplé** — persistance et alertes. Jetable si l'intégrateur a sa propre couche |

---

## API

Une fonction. C'est tout.

```ts
import { checkCompliance } from './rules'

const violations = checkCompliance(shifts, employees?, config?)
```

```ts
checkCompliance(
  shifts: ShiftRecord[],       // { id, employeeId, date, startTime, endTime, breakMinutes }
  employees?: EmployeeMeta[],  // { id, birthDate?, weeklyHours? } — optionnel
  config?: ComplianceConfig,   // active/désactive 4 alertes contextuelles
): Violation[]                 // { ruleId, employeeId, date, description, suggestedFix? }
```

**Les métadonnées employé sont facultatives.** Sans elles, les 11 règles générales
fonctionnent ; les 5 règles « mineurs » et le contrôle des heures contractuelles ne se
déclenchent que si `birthDate` / `weeklyHours` sont fournis. Aucune erreur, aucun faux
positif — la règle se tait simplement.

Métadonnées exportées pour l'affichage : `RULES` (le catalogue),
`RULES_ORDERED`, `RULE_COUNT`.

---

## Les 17 règles

Chaque règle porte sa référence légale dans le code (`legalRef`), pas dans un commentaire.

### Durées et repos — socle général

| Règle | Contrôle | Gravité | Référence |
|---|---|:---:|---|
| `rest_daily` | 11 h de repos consécutives entre deux services | 🔴 critique | Art. L3131-1 |
| `hours_daily_max` | 10 h de travail effectif par jour | 🔴 critique | Art. L3121-18 |
| `hours_weekly_max` | 48 h absolues sur la semaine | 🔴 critique | Art. L3121-20 |
| `hours_avg_weekly` | 44 h en moyenne sur 12 semaines consécutives | 🔴 critique | Art. L3121-22 |
| `weekly_rest_missing` | 35 h de repos continu sur 7 jours glissants | 🔴 critique | Art. L3132-2 |
| `days_consecutive` | 6 jours travaillés consécutifs maximum | 🔴 critique | Art. L3132-1 |
| `amplitude_max` | 13 h entre le début et la fin de la journée | 🟠 alerte | Art. L3121-1 + L3131-1 |
| `break_missing` | 20 min de pause au-delà de 6 h de service | 🟠 alerte | Art. L3121-16 |

### Organisation du travail

| Règle | Contrôle | Gravité | Référence |
|---|---|:---:|---|
| `night_work` | Au moins 1 h travaillée entre 21 h et 6 h | 🟠 alerte | Art. L3122-2 |
| `sunday_work` | Service planifié un dimanche (vérifier la dérogation) | 🔵 info | Art. L3132-3 |
| `part_time_split` | Plus d'une coupure dans la journée, salarié à temps partiel | 🟠 alerte | Art. L3123-23 + CCN HCR |
| `contract_hours_exceeded` | Heures planifiées au-delà de la durée contractuelle | 🟠 alerte | L3123-8 / L3121-28 |

### Salariés mineurs — 5 règles dédiées

C'est la partie la plus rarement implémentée, et celle qui expose le plus l'employeur.
Les seuils basculent automatiquement selon l'âge calculé **à la date du service**, pas à la
date du contrôle — un salarié qui passe 16 ans en cours de planning change de régime au
bon jour.

| Règle | Contrôle | Gravité | Référence |
|---|---|:---:|---|
| `minor_hours_daily` | 8 h par jour | 🔴 critique | Art. L3162-1 |
| `minor_hours_weekly` | 35 h par semaine | 🔴 critique | Art. L3162-1 |
| `minor_night_work` | Nuit interdite : 22 h–6 h, **et 20 h–6 h avant 16 ans** | 🔴 critique | Art. L3163-1 |
| `minor_rest_daily` | 12 h de repos, **14 h avant 16 ans** | 🔴 critique | Art. L3164-1 |
| `minor_break` | 30 min de pause par tranche de 4 h 30 continues | 🟠 alerte | Art. L3162-3 |

**Répartition :** 10 critiques · 6 alertes · 1 information.

---

## Conventions collectives

Quatre alertes sont **contextuelles** : elles signalent une situation licite mais à vérifier
selon la convention applicable — travail de nuit, travail du dimanche, coupures des temps
partiels, moyenne des 44 h. Elles se désactivent par établissement.

**Les plafonds durs ne sont jamais désactivables** — repos quotidien, 10 h/jour, 48 h/semaine,
et l'intégralité des règles mineurs. C'est volontaire : une alerte qu'on peut éteindre pour
se simplifier la vie n'est pas un garde-fou.

Dix conventions sont pré-câblées avec leurs défauts (`CONVENTION_ALERT_DEFAULTS`) :

`IDCC 1786` CHR · `IDCC 1286` CHR ancienne · `IDCC 1501` restauration rapide ·
`IDCC 3061` boulangerie-pâtisserie artisanale · `IDCC 2601` boulangerie industrielle ·
`IDCC 1979` hôtellerie · `IDCC 1938` traiteurs · `IDCC 2060` hôtellerie de plein air ·
`IDCC 2584` pizzerias · `HCR` (valeur historique)

Ajouter une convention = une ligne dans le tableau.

---

## Ce que ce module ne fait pas — à lire avant d'acheter

**Une limite juridique ouverte, signalée dans le code.** `part_time_split` porte un marqueur
`[À VÉRIFIER JURIDIQUEMENT]` : les limites précises de coupure pour les temps partiels sont
fixées par la convention collective, et l'implémentation retient une règle générale. Un
intégrateur qui vise le CHR devra la préciser au regard de la CCN applicable. **C'est la
seule règle dans ce cas** — les 16 autres s'appuient sur des articles du Code du travail
sans marge d'interprétation comparable.

**Ce qui n'est pas couvert**, et ne prétend pas l'être :
- pas de calcul de paie, de majorations d'heures supplémentaires ni de contreparties ;
- pas de gestion des congés payés, ni des absences et de leurs justificatifs ;
- pas d'accords d'entreprise ni d'aménagement du temps de travail sur l'année ;
- pas de gestion des dérogations (autorisation d'inspection du travail, accords de branche).

**Le moteur détecte, il ne décide pas.** Il ne bloque pas la publication d'un planning et ne
constitue pas un avis juridique — il signale, il cite l'article, il propose une correction.
La responsabilité de la décision reste à l'employeur, ce qui est le bon partage.

---

## Précision d'implémentation

Trois points qui font la différence entre une règle qui marche sur les cas d'école et une
règle qui marche en production :

- **Services de nuit à cheval sur deux jours** — un service 22 h → 06 h est traité comme une
  plage continue, pas comme deux journées. Les minutes de nuit sont calculées par
  intersection d'intervalles, y compris au-delà de minuit.
- **Âge calculé à la date du service.** Voir la section mineurs ci-dessus.
- **Repos hebdomadaire en fenêtre glissante**, pas par semaine calendaire : un salarié qui
  travaille du jeudi au mercredi suivant est détecté, alors qu'un découpage lundi-dimanche
  ne le verrait pas.

Ces trois comportements sont couverts par des tests dédiés — ce sont précisément les cas où
une réimplémentation rapide se trompe silencieusement.

---

## Tests

```
lib/compliance/rules.test.ts    351 lignes — les 17 règles, cas limites inclus
lib/compliance/config.test.ts    70 lignes — défauts par convention, activation
```

Les tests sont écrits en cas nommés, lisibles sans connaître le code. Ils constituent la
**spécification exécutable** du moteur : c'est là qu'est consignée l'interprétation retenue
pour chaque règle.

C'est ce qui distingue ce module d'une réimplémentation générée : produire 17 règles
plausibles est aujourd'hui rapide. Savoir laquelle est juste, et l'avoir figée dans un test
qui échouera si quelqu'un la change par inadvertance, ne l'est pas.
