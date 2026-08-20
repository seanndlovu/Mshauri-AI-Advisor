#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Mshauri — App setup & first deploy
# Run from the root of the cloned repo after 1-install-vps.sh
# Usage:  bash deploy/2-setup-app.sh
# ─────────────────────────────────────────────────────────────────
set -Eeuo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_DIR/deploy/.env.production"
NGINX_AVAILABLE="/etc/nginx/sites-available/mshauri"
NGINX_ENABLED="/etc/nginx/sites-enabled/mshauri"

fail() {
  echo "❌  $1" >&2
  exit 1
}

require_value() {
  local name="$1"
  local value="${!name:-}"
  if [ -z "$value" ] || [[ "$value" == change_this_* ]] || [[ "$value" == replace_with_* ]]; then
    fail "Missing or placeholder value for $name in $ENV_FILE"
  fi
}

echo "========================================="
echo "  Mshauri app setup"
echo "  Repo: $REPO_DIR"
echo "========================================="

# ── env file check ────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo "❌  Missing $ENV_FILE"
  echo "    Copy deploy/.env.example to deploy/.env.production and fill it in."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

# ── database ──────────────────────────────────────────────────────
echo "[1/5] Setting up PostgreSQL user & database..."
DB_NAME="${DB_NAME:-mshauri}"
DB_USER="${DB_USER:-mshauri}"
require_value DB_PASS
require_value SESSION_SECRET
source "$REPO_DIR/deploy/postgres-setup.sh"
configure_postgres
export SESSION_SECRET NODE_ENV PORT

# ── install & build ───────────────────────────────────────────────
echo "[2/5] Installing dependencies..."
cd "$REPO_DIR"
pnpm install --frozen-lockfile

echo "[3/5] Building..."
pnpm run typecheck:libs
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/mhauri-ai run build

echo "[4/5] Pushing DB schema..."
DATABASE_URL="$DATABASE_URL" pnpm --filter @workspace/db run push

# ── nginx ─────────────────────────────────────────────────────────
echo "[5/5] Installing Nginx config..."
DOMAIN="${DOMAIN:-localhost}"
STATIC_ROOT="$REPO_DIR/artifacts/mhauri-ai/dist/public"
API_PORT="${PORT:-8080}"

cat > "$NGINX_AVAILABLE" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    location /api/ {
        proxy_pass http://127.0.0.1:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    location / {
        root $STATIC_ROOT;
        try_files \$uri \$uri/ /index.html;
        gzip_static on;
    }
}
NGINX

ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
nginx -t && systemctl reload nginx

# ── PM2 ───────────────────────────────────────────────────────────
echo "Starting API server with PM2..."
pm2 describe mshauri-api > /dev/null 2>&1 && pm2 delete mshauri-api || true
pm2 start "$REPO_DIR/artifacts/api-server/dist/index.mjs" \
  --name mshauri-api \
  --update-env \
  --restart-delay 3000
pm2 startup systemd -u "$(id -un)" --hp "$HOME"
pm2 save

echo ""
echo "✅  Mshauri is running!"
echo ""
echo "   API:      http://$DOMAIN/api/healthz"
echo "   App:      http://$DOMAIN"
echo ""
echo "   To add SSL (HTTPS), run:"
echo "   sudo certbot --nginx -d $DOMAIN"
