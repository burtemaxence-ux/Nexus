#!/usr/bin/env bash
# ============================================================================
# Rejoue supabase/migrations/*.sql sur une base Postgres vierge.
# Sert à détecter la dérive entre le dépôt et la prod, et de base éphémère en CI.
#
# Usage :  supabase/harness/replay.sh [DBNAME]
# Env   :  PGHOST (défaut /tmp), PGPORT (défaut 55432), PGUSER (défaut postgres)
# Sortie:  0 si toutes les migrations passent, 1 sinon (liste des échecs).
# ============================================================================
set -uo pipefail

DB="${1:-replay}"
export PGHOST="${PGHOST:-/tmp}"
export PGPORT="${PGPORT:-55432}"
export PGUSER="${PGUSER:-postgres}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS="$HERE/../migrations"

psql -q -d postgres -c "DROP DATABASE IF EXISTS $DB" >/dev/null
psql -q -d postgres -c "CREATE DATABASE $DB" >/dev/null
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$HERE/00_supabase_bootstrap.sql" >/dev/null || {
  echo "❌ bootstrap du harnais en échec"; exit 1; }

failed=0
for f in $(ls "$MIGRATIONS"/*.sql | sort); do
  name="$(basename "$f")"
  if err=$(psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" 2>&1 >/dev/null); then
    echo "✅ $name"
  else
    failed=$((failed + 1))
    echo "❌ $name"
    echo "$err" | grep -E '^psql:|ERROR' | head -3 | sed 's/^/     /'
  fi
done

echo
if [ "$failed" -eq 0 ]; then
  echo "✅ $(ls "$MIGRATIONS"/*.sql | wc -l) migrations rejouées sans erreur sur '$DB'."
else
  echo "❌ $failed migration(s) en échec sur '$DB'."
fi
exit $([ "$failed" -eq 0 ] && echo 0 || echo 1)
