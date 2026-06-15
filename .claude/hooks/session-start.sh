#!/bin/bash
set -euo pipefail

# SessionStart hook — Claude Code on the web démarre depuis un conteneur neuf.
# On installe les dépendances pour que le build, les tests (Vitest) et le linter
# soient utilisables immédiatement dans la session.

# Ne rien faire en local : l'environnement du dev a déjà ses node_modules.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Idempotent et non-interactif. `npm install` profite du cache du conteneur.
npm install --no-audit --no-fund
