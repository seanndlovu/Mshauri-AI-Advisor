#!/usr/bin/env bash
# Shared PostgreSQL setup used by the first deploy and update scripts.
# This file must be sourced after .env.production has been loaded.

set -Eeuo pipefail

validate_postgres_identifier() {
  local name="$1"
  local value="$2"

  if [[ ! "$value" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    echo "❌  $name must contain only letters, numbers, and underscores and must not start with a number." >&2
    return 1
  fi
}

configure_postgres() {
  : "${DB_NAME:?DB_NAME is required}"
  : "${DB_USER:?DB_USER is required}"
  : "${DB_PASS:?DB_PASS is required}"

  validate_postgres_identifier "DB_NAME" "$DB_NAME"
  validate_postgres_identifier "DB_USER" "$DB_USER"

  # URL-encode the password so special characters work correctly in PostgreSQL.
  DB_PASS_ENCODED="$(node -p 'encodeURIComponent(process.argv[1])' "$DB_PASS")"
  DATABASE_URL="postgresql://${DB_USER}:${DB_PASS_ENCODED}@localhost:5432/${DB_NAME}"
  export DB_NAME DB_USER DB_PASS DATABASE_URL

  # The password is passed through SQL stdin rather than a command-line
  # argument, so it does not appear in the process list. Apostrophes are
  # doubled for a PostgreSQL string literal.
  local db_pass_sql="${DB_PASS//\'/\'\'}"

  echo "Reconciling PostgreSQL role and database..."
  sudo -u postgres psql -v ON_ERROR_STOP=1 --dbname=postgres <<SQL
SELECT 'CREATE ROLE "$DB_USER" LOGIN PASSWORD ' || quote_literal('$db_pass_sql')
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'
)
\gexec

ALTER ROLE "$DB_USER" WITH LOGIN PASSWORD '$db_pass_sql';

SELECT 'CREATE DATABASE "$DB_NAME" OWNER "$DB_USER"'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'
)
\gexec

ALTER DATABASE "$DB_NAME" OWNER TO "$DB_USER";
GRANT ALL PRIVILEGES ON DATABASE "$DB_NAME" TO "$DB_USER";
SQL

  # PostgreSQL 15+ may leave the public schema owned by pg_database_owner
  # after a database was created by an earlier attempt. Make the application
  # role able to create and alter Drizzle-managed tables.
  sudo -u postgres psql -v ON_ERROR_STOP=1 --dbname="$DB_NAME" <<SQL
ALTER SCHEMA public OWNER TO "$DB_USER";
GRANT USAGE, CREATE ON SCHEMA public TO "$DB_USER";
SQL

  echo "Checking the application database login..."
  if ! PGPASSWORD="$DB_PASS" psql --no-password "$DATABASE_URL" \
      -v ON_ERROR_STOP=1 \
      -c 'SELECT current_user, current_database()' >/dev/null; then
    echo "❌  PostgreSQL login failed for $DB_USER on database $DB_NAME." >&2
    echo "    Check DB_PASS in deploy/.env.production and run this setup again." >&2
    return 1
  fi

  echo "✅ PostgreSQL login and schema permissions verified."
}