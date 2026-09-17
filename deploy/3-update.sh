#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Mshauri — Pull latest code and redeploy
# Run from the repo root whenever you push new code to GitHub
# Usage:  bash deploy/3-update.sh
# ─────────────────────────────────────────────────────────────────
set -Eeuo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_DIR/deploy/.env.production"

cd "$REPO_DIR"

echo "[1/4] Pulling latest code..."
git pull --ff-only

# If this script was launched from an older checkout, reload the freshly
# pulled script so the database reconciliation fix is used immediately.
if [ "${MSHAURI_UPDATE_REEXEC:-0}" != "1" ]; then
  export MSHAURI_UPDATE_REEXEC=1
  exec bash "$REPO_DIR/deploy/3-update.sh"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "❌  Missing $ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

ADS_UPLOAD_DIR="${ADS_UPLOAD_DIR:-/var/lib/mshauri/ads}"
mkdir -p "$ADS_UPLOAD_DIR"
export ADS_UPLOAD_DIR

if [ -z "${DB_PASS:-}" ] || [ -z "${SESSION_SECRET:-}" ]; then
  echo "❌  DB_PASS and SESSION_SECRET must be set in $ENV_FILE" >&2
  exit 1
fi

if [ -z "${CLERK_PUBLISHABLE_KEY:-}" ]; then
  echo "❌  CLERK_PUBLISHABLE_KEY must be set in $ENV_FILE" >&2
  exit 1
fi

# The API uses CLERK_PUBLISHABLE_KEY directly. Vite only exposes variables
# prefixed with VITE_, so pass the same public key into the static web build.
# The proxy is served by the same VPS under this path in production.
export VITE_CLERK_PUBLISHABLE_KEY="${VITE_CLERK_PUBLISHABLE_KEY:-$CLERK_PUBLISHABLE_KEY}"
export VITE_CLERK_PROXY_URL="${VITE_CLERK_PROXY_URL:-/api/__clerk}"
export OWNER_BOOTSTRAP_EMAIL="${OWNER_BOOTSTRAP_EMAIL:-ndlovusean@gmail.com}"

DB_NAME="${DB_NAME:-mshauri}"
DB_USER="${DB_USER:-mshauri}"
source "$REPO_DIR/deploy/postgres-setup.sh"
configure_postgres
export SESSION_SECRET NODE_ENV PORT ADS_UPLOAD_DIR

echo "[2/4] Installing dependencies..."
pnpm install --frozen-lockfile

echo "[3/4] Building..."
pnpm run typecheck:libs
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/mhauri-ai run build

echo "[4/5] Updating database schema..."
DATABASE_URL="$DATABASE_URL" pnpm --filter @workspace/db run push

echo "Clearing legacy password credentials while preserving users and content..."
PGPASSWORD="$DB_PASS" psql --no-password "$DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -c 'UPDATE "users" SET "password_hash" = NULL WHERE "password_hash" IS NOT NULL;'

echo "Restarting API server..."
pm2 restart mshauri-api --update-env

echo ""
echo "✅  Update complete."
