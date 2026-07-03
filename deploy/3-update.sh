#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Mshauri — Pull latest code and redeploy
# Run from the repo root whenever you push new code to GitHub
# Usage:  bash deploy/3-update.sh
# ─────────────────────────────────────────────────────────────────
set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_DIR/deploy/.env.production"

cd "$REPO_DIR"

echo "[1/4] Pulling latest code..."
git pull

echo "[2/4] Installing dependencies..."
pnpm install --frozen-lockfile

echo "[3/4] Building..."
set -a && source "$ENV_FILE" && set +a
pnpm run typecheck:libs
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/mhauri-ai run build

echo "[4/4] Restarting API server..."
pm2 restart mshauri-api

echo ""
echo "✅  Update complete."
