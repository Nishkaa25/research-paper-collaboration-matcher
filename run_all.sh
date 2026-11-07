#!/usr/bin/env bash
# Build the whole database from scratch and run every script.
#   usage:  ./run_all.sh [database_name]        (default: rpcm)
# Needs PostgreSQL 15+ with the pgvector extension installed and a role that can CREATE EXTENSION.
set -euo pipefail
DB="${1:-rpcm}"
PSQL="psql -v ON_ERROR_STOP=1 -X -q"
cd "$(dirname "$0")/sql"

createdb "$DB" 2>/dev/null || echo "(database $DB already exists - reusing it)"

for f in 01_schema.sql 02_alter_ddl.sql 03_views_functions_triggers.sql 04_seed.sql; do
  echo ">> $f"; $PSQL -d "$DB" -f "$f" 2>&1 | grep -v NOTICE || true
done

echo ">> 05_dml_operations.sql"; psql -X -d "$DB" -f 05_dml_operations.sql > ../output/05_dml_operations.out 2>&1
echo ">> 06_queries.sql";        psql -X -d "$DB" -f 06_queries.sql        > ../output/06_queries.out 2>&1
echo ">> 07_tests.sql";          psql -X -d "$DB" -f 07_tests.sql          > ../output/07_tests.out 2>&1
if [ -n "${APP_PASSWORD:-}" ]; then psql -X -d "$DB" -v app_password="$APP_PASSWORD" -f 08_security_roles.sql > ../output/08_security.out 2>&1; fi
tail -n 8 ../output/07_tests.out
