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

if [ -z "${DB_PASS:-}" ] || [ -z "${SESSION_SECRET:-}" ]; then
  echo "❌  DB_PASS and SESSION_SECRET must be set in $ENV_FILE" >&2
  exit 1
fi

DB_NAME="${DB_NAME:-mshauri}"
DB_USER="${DB_USER:-mshauri}"
source "$REPO_DIR/deploy/postgres-setup.sh"
configure_postgres
export SESSION_SECRET NODE_ENV PORT

echo "[2/4] Installing dependencies..."
pnpm install --frozen-lockfile

echo "[3/4] Building..."
pnpm run typecheck:libs
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/mhauri-ai run build

echo "[4/4] Updating database schema and restarting API server..."
DATABASE_URL="$DATABASE_URL" pnpm --filter @workspace/db run push
pm2 restart mshauri-api --update-env

echo ""
echo "✅  Update complete."
