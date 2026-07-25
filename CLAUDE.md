# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project conventions

**Couleurs / thème** : le projet utilise des tokens CSS (`--text-primary`, `--bg-card`, `--accent`…). Deux façons équivalentes existent (le CSS produit est identique) :
- inline `style={{ color: 'var(--text-primary)' }}` — convention historique majoritaire
- classes Tailwind `className="text-text-primary"` — alias des mêmes tokens (voir `tailwind.config.ts`)

Ne PAS lancer de migration de masse de l'un vers l'autre (gain nul, risque élevé). Rester **cohérent à l'intérieur d'un même fichier** ; convertir au passage les styles mono-propriété simples quand on édite déjà le fichier.

---

## Session Start Protocol ⚡

`.gitignore` exclut tout `.claude/` sauf `settings.json` et `hooks/`. Les notes qui
s'y trouvent sont donc **locales** : absentes d'un clone frais et des sessions Claude
Code on the web. Ne jamais les traiter comme du contexte acquis.

**Au démarrage, lire _si présents_** (sinon passer, ce n'est pas une erreur) :
- `.claude/COMMON_MISTAKES.md` — pièges déjà rencontrés
- `.claude/QUICK_START.md` — commandes essentielles
- `.claude/ARCHITECTURE_MAP.md` — où se trouve quoi

**En fin de tâche** (local uniquement — ces dossiers sont gitignorés, donc inutile
en session cloud où le conteneur est éphémère) :
- doc de complétion dans `.claude/completions/YYYY-MM-DD-task-name.md`
- archiver le fichier de session dans `.claude/sessions/archive/`

**⚠️ NE JAMAIS auto-charger** : `.claude/completions/`, `.claude/sessions/`,
`docs/archive/`.

---

**Last Updated**: 2026-07-25
**Optimized with**: [Claude Token Optimizer](https://github.com/nadimtuhin/claude-token-optimizer)
