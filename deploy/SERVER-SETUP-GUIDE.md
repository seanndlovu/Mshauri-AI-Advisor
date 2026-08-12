# Mshauri — Server Deployment Guide
### For: mshauri.marichomedia.com
### Server: 50.6.195.160 (Ubuntu 24.04.4 / Virtualmin)

---

## Server Specs (confirmed)
| | |
|---|---|
| **IP Address** | 50.6.195.160 |
| **OS** | Ubuntu Linux 24.04.4 ✅ |
| **RAM** | 3.82 GB total (sufficient) |
| **Disk** | 98.25 GB total / 43 GB free (sufficient) |
| **CPU** | 2 cores (AMD EPYC) |
| **Panel** | Virtualmin 8.1 / Webmin 2.451 |
| **Target domain** | mshauri.marichomedia.com |

---

## Before You Begin — What You Need From the Client

Ask the client to provide these secret values before starting:

| Variable | Description | Who provides it |
|---|---|---|
| `DB_PASS` | Any strong password you choose for the database | You choose it |
| `SESSION_SECRET` | Any random 64+ character string | You generate it (see below) |
| `OPENAI_API_KEY` | OpenAI API key (starts with `sk-`) | Client provides |
| `WHATSAPP_ACCESS_TOKEN` | Meta Business never-expiring system user token | Client provides |
| `WHATSAPP_PHONE_NUMBER_ID` | From Meta Business Manager | Client provides |
| `WHATSAPP_VERIFY_TOKEN` | Any string you choose (used for webhook verification) | You choose it |

**Generate SESSION_SECRET:**
```bash
openssl rand -hex 32
```

---

## Step 0 — DNS (Do This First, Before Anything Else)

Point the subdomain to the server IP **before** requesting an SSL certificate.

In Maricho Media's DNS manager, add an **A record**:
```
Type:  A
Name:  mshauri
Value: 50.6.195.160
TTL:   300 (or Auto)
```

Wait 5–15 minutes for DNS to propagate. Verify with:
```bash
nslookup mshauri.marichomedia.com
# Should return: 50.6.195.160
```

---

## Step 1 — SSH Into the Server

```bash
ssh root@50.6.195.160
# or if using a sudo user:
ssh username@50.6.195.160
```

---

## Step 2 — Important: Stop Apache (Virtualmin uses Apache by default)

Virtualmin installs Apache on port 80. Our app uses Nginx. You must stop Apache first, otherwise there will be a port conflict.

```bash
# Check what is running on port 80
sudo lsof -i :80

# Stop Apache and prevent it from starting on reboot
sudo systemctl stop apache2
sudo systemctl disable apache2

# Confirm Apache is stopped
sudo systemctl status apache2
```

> ⚠️ **Note to technician:** This will take down any other websites on this server running via Apache. If there are other active websites on this server, discuss with the client before disabling Apache. Alternative: configure a virtual host in Apache to proxy to the app (contact developer for that config).

---

## Step 3 — Clone the Repository

```bash
cd /var/www
git clone https://github.com/seanndlovu/Mshauri-AI-Advisor.git mshauri
cd mshauri
```

---

## Step 4 — Install Server Dependencies (Run Once)

This installs Node.js 24, pnpm, PM2, PostgreSQL 16, Nginx, and Certbot.

```bash
sudo bash deploy/1-install-vps.sh
```

Expected output ends with: `✅ All dependencies installed.`

This takes 3–5 minutes. If it fails partway through, it is safe to run again.

---

## Step 5 — Configure Environment Variables

```bash
cp deploy/.env.example deploy/.env.production
nano deploy/.env.production
```

The file is pre-filled — you only need to update the secrets. It should look like this when done:

```env
PORT=8080
NODE_ENV=production
DOMAIN=mshauri.marichomedia.com

DB_NAME=mshauri
DB_USER=mshauri
DB_PASS=your_strong_db_password_here
DATABASE_URL=postgresql://mshauri:your_strong_db_password_here@localhost:5432/mshauri

SESSION_SECRET=paste_the_64_char_random_string_here

OPENAI_API_KEY=sk-...

WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=your_chosen_webhook_token
```

> ⚠️ `DB_PASS` must match in both the `DB_PASS=` line and inside `DATABASE_URL=`. Copy carefully.

Save and exit: `Ctrl+X` → `Y` → `Enter`

---

## Step 6 — Build and Launch the App

```bash
bash deploy/2-setup-app.sh
```

This script does the following automatically:
1. Creates the PostgreSQL database and user
2. Installs all Node.js packages (`pnpm install`)
3. Typechecks and builds the API server and frontend
4. Pushes the database schema (creates all tables)
5. Writes the Nginx config file
6. Starts the API server with PM2 (auto-restarts on crash/reboot)

Expected final output:
```
✅  Mshauri is running!

   API:      http://mshauri.marichomedia.com/api/healthz
   App:      http://mshauri.marichomedia.com
```

**Verify it is working:**
```bash
curl http://localhost/api/healthz
# Should return: {"status":"ok"}
```

---

## Step 7 — Add SSL / HTTPS (Required — login will not work without it)

DNS must be pointed at the server (Step 0) before this works.

```bash
sudo certbot --nginx -d mshauri.marichomedia.com
```

When prompted:
- Enter an email address for certificate renewal notices
- Agree to terms (type `Y`)
- Choose whether to redirect HTTP → HTTPS (choose **2 — Redirect**, recommended)

Certbot auto-renews the certificate every 90 days. Test renewal with:
```bash
sudo certbot renew --dry-run
```

---

## Step 8 — Verify Everything Is Working

```bash
# 1. API health check
curl https://mshauri.marichomedia.com/api/healthz

# 2. PM2 process status
pm2 status

# 3. Check API logs
pm2 logs mshauri-api --lines 50

# 4. Check Nginx config is valid
sudo nginx -t
```

Open a browser and visit `https://mshauri.marichomedia.com` — the app should load.

---

## Deploying Future Updates

Whenever new code is pushed to GitHub:

```bash
cd /var/www/mshauri
bash deploy/3-update.sh
```

This pulls the latest code, rebuilds, and restarts the API. The frontend updates are instant (static files). The API restarts in ~3 seconds.

---

## Useful Commands Reference

### PM2 (Node.js process manager)
```bash
pm2 status                  # is the API running?
pm2 logs mshauri-api        # live log stream (Ctrl+C to exit)
pm2 logs mshauri-api --lines 100  # last 100 log lines
pm2 restart mshauri-api     # manual restart
pm2 stop mshauri-api        # stop the API
pm2 start mshauri-api       # start the API
```

### Nginx (web server)
```bash
sudo nginx -t                    # test config for errors
sudo systemctl reload nginx      # apply config changes (no downtime)
sudo systemctl restart nginx     # full restart
sudo journalctl -u nginx -f      # live Nginx logs
cat /etc/nginx/sites-available/mshauri   # view the generated config
```

### PostgreSQL (database)
```bash
sudo -u postgres psql -c "\l"         # list databases
sudo -u postgres psql mshauri         # open database shell
sudo systemctl status postgresql      # is PostgreSQL running?
sudo systemctl restart postgresql     # restart PostgreSQL
```

### SSL Certificate
```bash
sudo certbot certificates             # list certificates and expiry dates
sudo certbot renew --dry-run          # test auto-renewal
```

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| Port 80 in use | Apache still running | `sudo systemctl stop apache2 && sudo systemctl disable apache2` |
| `502 Bad Gateway` in browser | PM2/Node process crashed | `pm2 restart mshauri-api && pm2 logs mshauri-api` |
| App loads but login fails | HTTPS not set up | Run Step 7 (Certbot) |
| `DATABASE_URL` error on startup | DB not created or password mismatch | Re-run `bash deploy/2-setup-app.sh` after fixing `.env.production` |
| Certbot fails: domain not found | DNS not propagated yet | Wait 15 mins, verify with `nslookup mshauri.marichomedia.com` |
| Build fails: out of memory | RAM too low during build | Add swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` |

---

## Architecture Summary

```
User's Browser
      │
      ▼ HTTPS (port 443)
   Nginx  ──────────────────────── serves frontend static files
      │                            (artifacts/mhauri-ai/dist/)
      │ /api/* requests
      ▼
   Node.js API (port 8080)         managed by PM2
      │
      ▼
   PostgreSQL (port 5432)          local, not exposed to internet
```

---

## Security Notes for the Technician

- PostgreSQL is local-only — it is NOT exposed to the internet
- The `.env.production` file contains secrets — do not commit it to git or share it
- Webmin/Virtualmin (port 10000) is still accessible — restrict access by IP if possible
- Run `sudo apt update && sudo apt upgrade -y` monthly for security patches
- The SSL certificate auto-renews — no manual action needed

---

*Generated for Maricho Media — Mshauri deployment*
*GitHub: https://github.com/seanndlovu/Mshauri-AI-Advisor*
