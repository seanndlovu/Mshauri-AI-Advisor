---
name: Replit development origin checks
description: Strict mutation-origin validation under Replit's path-based development proxy.
---

When enforcing a browser-origin allowlist in development, include the HTTPS origin derived from `REPLIT_DEV_DOMAIN` while keeping production limited to explicit configured origins.

**Why:** Replit's development proxy can forward a request host that differs from the public browser origin, so a strict host comparison can reject a legitimate development browser request.

**How to apply:** Add `REPLIT_DEV_DOMAIN` only when `NODE_ENV` is not production. Keep `DOMAIN` and explicit CORS origins as the production source of truth; do not use the development-domain exception in deployed environments.