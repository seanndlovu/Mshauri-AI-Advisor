# Mshauri — Self-hosting on a VPS

## What you need on the VPS

| Technology | Purpose |
|---|---|
| **Node.js 24** | Runs the API server |
| **pnpm** | Package manager / build tool |
| **PostgreSQL 16** | Database |
| **PM2** | Keeps the Node process alive, auto-restarts on crash/reboot |
| **Nginx** | Serves the frontend static files + reverse-proxies `/api` to Node |
| **Certbot** | Free SSL certificates (HTTPS is required for login cookies) |

## First-time setup (3 steps)

### Step 1 — Install VPS dependencies (run once)
```bash
sudo bash deploy/1-install-vps.sh
```

### Step 2 — Configure your environment
```bash
cp deploy/.env.example deploy/.env.production
nano deploy/.env.production   # fill in your values
```

### Step 3 — Build and launch
```bash
bash deploy/2-setup-app.sh
```

### Add SSL (strongly recommended)
```bash
sudo certbot --nginx -d your-domain.com
```

## Deploying updates
Every time you push new code to GitHub and want to update the server:
```bash
bash deploy/3-update.sh
```

## Useful PM2 commands
```bash
pm2 status              # check if API is running
pm2 logs mshauri-api    # live logs
pm2 restart mshauri-api # manual restart
```

## Useful Nginx commands
```bash
sudo nginx -t                    # test config
sudo systemctl reload nginx      # apply config changes
sudo journalctl -u nginx -f      # nginx logs
```
