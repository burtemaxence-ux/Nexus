#!/usr/bin/env bash
# ============================================================================
# Exécute les tests d'intégration SQL de supabase/harness/tests/ sur une base
# déjà rejouée par replay.sh. Chaque test s'exécute dans une transaction qu'il
# annule lui-même : l'ordre n'a pas d'importance et rien ne persiste.
#
# Usage :  supabase/harness/run-tests.sh [DBNAME]
# ============================================================================
set -uo pipefail

DB="${1:-replay}"
export PGHOST="${PGHOST:-/tmp}"
export PGPORT="${PGPORT:-55432}"
export PGUSER="${PGUSER:-postgres}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
failed=0

for f in "$HERE"/tests/*.sql; do
  [ -e "$f" ] || { echo "Aucun test dans $HERE/tests/"; exit 0; }
  name="$(basename "$f")"
  if out=$(psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" 2>&1); then
    echo "✅ $name"
    echo "$out" | grep -E '^(psql:.*)?NOTICE' | sed 's/^.*NOTICE: */     /'
  else
    failed=$((failed + 1))
    echo "❌ $name"
    echo "$out" | grep -E 'ERROR' | sed 's/^.*ERROR: */     /'
  fi
done

echo
[ "$failed" -eq 0 ] && echo "✅ Tests d'intégration SQL au vert." \
                    || echo "❌ $failed test(s) d'intégration en échec."
exit $([ "$failed" -eq 0 ] && echo 0 || echo 1)
