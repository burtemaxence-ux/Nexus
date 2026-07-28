# Décision de trajectoire — Quartzbase

---

# ⬛ POINT DE CONTRÔLE — DÉCISION DU 28 JUILLET 2026

**Date :** 2026-07-28
**Décideur :** Maxence (fondateur)
**Déclencheur :** point de contrôle « fin juillet » fixé le 16/06 et rappelé au §0 du
plan d'action du 21/07 (échéance : 27/07).

## Constat — mesuré, pas estimé

Le nombre de clients payants n'était visible ni dans le code ni dans les audits. Il a été
lu directement en base de production le 28/07/2026 :

| Mesure | Valeur |
|---|---|
| **Clients payants externes** | **0** |
| **MRR externe** | **0 €** |
| Abonnements Stripe `active` | 2 — « Restaurant chez maxouxou » (0 membre, 0 planning) et « Le Bistrot Parisien » (comptes `@demo.qb.fr`) : comptes personnels/démo |
| Comptes utilisateurs (19) | `demo.qb.fr` 8 · `nexus-demo.fr` 6 · `gmail.com` 4 · `quartzbase.fr` 1 — **aucun domaine d'établissement réel** |
| Connexions réelles | une seule adresse s'est jamais connectée (la gmail du fondateur, 27/07) |
| Établissements | 5, dont 2 vides, 1 compte perso, 2 jeux de démo |
| Activité 30 j | 121 plannings, tous sur le jeu de démo — dernier le 11/07 |

Aucun tiers n'a créé de compte, ne s'est connecté, ni n'a payé. Le produit n'a jamais
rencontré son marché : il n'a pas été confronté à un seul utilisateur externe.

## Décision actée

L'arbre de décision du §0 du plan d'action (`0 client → PISTE B`) est appliqué **sans
dérogation** :

> **PISTE B — CESSION DE L'ACTIF COMPLET.**
> Vendre Quartzbase : code, domaine `quartzbase.fr`, marque, moteur de conformité,
> base technique. Cible : éditeurs caisse/paie CHR, cabinets comptables CHR, ou
> marketplace SaaS. Horizon : engager ≥ 1 discussion d'acquisition avant fin août 2026.

Trajectoires écartées ce jour :
- **Piste A / A' (commercialisation)** — écartée. À 0 client et ~5 semaines de runway, signer
  un client qu'on ne pourra pas supporter après septembre crée une dette envers lui, pas de
  la valeur.
- **Mise en pause / abandon silencieux** — écartée : l'actif technique est réel et se déprécie
  vite (dépendances, coûts d'infra, pertinence du copy réglementaire).

## Ce que ça change à partir de maintenant

1. **Gel des features (T-5).** Seules passent : les corrections de bugs, et le travail qui
   augmente la valeur transmissible. Tout le reste est interdit — y compris les items P1/P2
   du plan du 21/07 (KPI €, A/B Sonnet, export paie, upsell annuel), qui n'ont de sens qu'en
   Piste A.
2. **Aucun nouveau client signé.** Ni essai commercial, ni porte-à-porte (G-1 à G-5 annulés).
3. **Exécution du paquet de cession** (§5 du plan du 21/07) : T-1 runbook de reprise,
   T-2 dossier de cession, T-3 liste d'acquéreurs, T-4 email de continuité (sans objet ici :
   0 client externe à prévenir — seul point positif de ce constat).

## Ce sur quoi porte la valeur

Ce qui se vend ici n'est pas un revenu (il n'y en a pas), c'est un actif :
- `lib/compliance` — 8 règles de droit du travail français implémentées et testées.
  Désigné « actif n°1 en cas de cession » par l'audit du 21/07 ;
- une base technique auditée : 247 tests, 0 advisor de performance Supabase, RLS multi-tenant
  vérifiée, circuits d'argent Stripe couverts, CI complète ;
- le domaine `quartzbase.fr`, la marque et l'identité ;
- 63 pages / 99 routes API prêtes à l'emploi, avec les pages SEO réglementaires.

## À vérifier immédiatement (Maxence)

- [ ] **Les 2 abonnements Stripe `active` sont-ils en mode *live*** ? Si oui, tu te factures
      toi-même (2 × 49 €/mois, prochaines échéances 04/08 et 16/08) : à résilier avant qu'elles
      ne repassent. Non vérifiable depuis la base — à lire dans le dashboard Stripe.

## Ce que cette décision ne dit pas

Elle n'engage aucun prix ni aucun acquéreur. Un SaaS sans revenu ne se valorise pas sur un
multiple : la fourchette réaliste se décidera au vu des premiers retours d'acquéreurs (T-3).

---

> Ci-dessous : la décision initiale du **16 juin 2026**, conservée telle quelle pour
> l'historique. Elle est **remplacée** par la décision du 28/07 ci-dessus.

---

**Date :** 2026-06-16
**Décideur :** Maxence (fondateur)
**Contexte :** entrée en gendarmerie prévue ~septembre 2026 ; produit fonctionnel en prod ; 0 client payant prouvé à date.

## Décision actée

**Continuer le développement pendant les 3-4 mois restants avant la gendarmerie** (horizon ~septembre 2026).

Trajectoire écartée pour l'instant : vente/acqui-hire immédiat, transmission à un associé, mise en pause.

## Cadrage de la fenêtre (juin → septembre)

Cette fenêtre est un **runway avec une date de fin dure**. Pour qu'elle crée de la valeur (et ne reste pas un projet de CV), l'effort se priorise ainsi :

1. **Protéger (fait) :** Vague 0 de correction bouclée — sécurité (isolation tenant), cohérence billing, non-responsabilité conformité.
2. **Débloquer la vente :** finir les bloqueurs de lancement (Vague 1 : cohérence parrainage, anti-abus, pointage, copy landing).
3. **Obtenir des clients (priorité n°1 réelle) :** exécuter la Phase 1 du GTM — signer le client #1 (la boulangerie de Maxence) + 3-5 établissements test, capturer témoignages. **C'est la seule chose qui transforme l'actif.**
4. **Améliorer (optionnel) :** Vagues 2-3 (UX, tests, support) uniquement si elles servent à convertir/retenir des clients réels.

## Garde-fou

> Coder plus n'augmente la valeur que si ça se convertit en clients. À 0 client, chaque semaine passée sur des features plutôt que sur la vente détruit du temps de runway.

## Point de contrôle

**Fin juillet 2026** : revoir cette décision à la lumière des résultats.
- Si ≥ 3-5 clients payants et rétention positive → continuer, viser une vente d'actif plus tard ou une transmission.
- Si 0-1 client → rebascule probable vers acqui-hire ou transmission avant septembre (ne pas laisser de clients sans support après le départ).

## Implications support / clients

Tant que la continuité post-septembre n'est pas réglée, **être transparent** avec les premiers clients sur le modèle de support, et préparer dès maintenant un runbook minimal (cf. Vague 3 / R3-R5) pour ne stranger personne en septembre.
