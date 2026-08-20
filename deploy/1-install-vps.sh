#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Mshauri — VPS dependency installer
# Run once on a fresh Ubuntu 22.04 / 24.04 VPS as root or sudo user
# Usage:  sudo bash 1-install-vps.sh
# ─────────────────────────────────────────────────────────────────
set -Eeuo pipefail

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "❌  Run this installer with sudo: sudo bash deploy/1-install-vps.sh" >&2
  exit 1
fi

echo "========================================="
echo "  Mshauri VPS installer"
echo "========================================="

# 1. System packages
echo "[1/6] Updating system packages..."
apt update -y && apt upgrade -y
apt install -y curl git unzip build-essential

# 2. Node.js 24
echo "[2/6] Installing Node.js 24..."
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
node -v

# 3. pnpm
echo "[3/6] Installing pnpm..."
npm install -g pnpm
pnpm -v

# 4. PM2 (process manager)
echo "[4/6] Installing PM2..."
npm install -g pm2

# 5. PostgreSQL 16
echo "[5/6] Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# 6. Nginx + Certbot (SSL)
echo "[6/6] Installing Nginx and Certbot..."
apt install -y nginx certbot python3-certbot-nginx
systemctl enable nginx
systemctl start nginx
ufw allow "Nginx Full" || true

echo ""
echo "✅  All dependencies installed."
echo "Next: fill in deploy/.env.production, then run  bash 2-setup-app.sh"
