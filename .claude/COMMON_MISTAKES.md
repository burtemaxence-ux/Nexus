# ⚠️ Common Mistakes — à lire AVANT de coder

Erreurs réellement commises sur ce repo. Chaque entrée a coûté du temps ou un bug.

## 1. Réutiliser un numéro de migration
Deux fichiers `0XX_*.sql` avec le même préfixe = ordre d'application ambigu,
drift prod/repo (6 collisions nettoyées le 2026-07-06). **Toujours** prendre le
numéro annoncé dans `docs/migrations-state.md` (« Prochaine migration »), puis
le mettre à jour. Le test `supabase/migrations.test.ts` casse la suite sinon.

## 2. Écrire une chaîne marketing en dur (« 14 jours », « 7 règles »…)
La refonte landing a réintroduit « 14 jours gratuits » ×9 alors que l'essai
réel est de 30 j. Les chiffres produit se **dérivent du code** :
`TRIAL_DAYS` (lib/subscription), `RULE_COUNT` (lib/compliance/rules),
`REFERRAL_MAX_DISCOUNT` (lib/referral), `PLAN_META` (lib/stripe).

## 3. Baser une décision d'accès sur `user_metadata`
`user_metadata` est modifiable par le client (`auth.updateUser`). Le rôle
autoritaire vient de `profiles` (RLS) : `requireManager`/`requireEmployee`
côté API, lecture DB dans le middleware. `user_metadata.role` absent signale
seulement l'onboarding.

## 4. Oublier que la RLS ne s'applique qu'au rôle `authenticated`
Un fetch server-side avec le client anon (pas de cookies — cron, flux iCal,
webhook) retourne **zéro ligne** sans erreur. Si l'accès est authentifié
autrement (token HMAC, CRON_SECRET), utiliser `supabaseAdmin` et filtrer
explicitement par `establishment_id` / `employee_id`.

## 5. Modifier la prod sans certifier ni documenter
Toute migration appliquée via MCP/SQL Editor doit être : (1) committée dans
`supabase/migrations/`, (2) tracée dans `docs/migrations-state.md` avec la
date et la sonde de vérification. « Je l'ai appliquée, je documenterai plus
tard » = le drift de juin.

## 6. Documenter une décision sans toucher la config (ou l'inverse)
Le cron `weekly-summary-employee` est resté planifié dans `vercel.json` trois
semaines après avoir été documenté « retiré ». Une décision = le doc **et** la
config dans le même commit.

## 7. Side effects silencieux quand une env var manque
`lib/sms.ts` retourne `false` sans Twilio, l'IA renvoie 503 sans clé. OK,
mais tout nouveau service doit apparaître dans `/api/health` et dans la
santé des services de `/admin` — sinon la promesse client meurt en silence.
