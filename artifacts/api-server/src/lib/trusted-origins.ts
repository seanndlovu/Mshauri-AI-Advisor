import type { Request } from "express";

function configuredOrigins(): Set<string> {
  const origins = new Set<string>();
  const domain = process.env.DOMAIN?.trim();
  if (domain) origins.add(`https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`);
  for (const value of (process.env.CORS_ORIGINS ?? "").split(",")) {
    const origin = value.trim().replace(/\/$/, "");
    if (origin) origins.add(origin);
  }
  if (process.env.NODE_ENV !== "production") {
    const replitDevDomain = process.env.REPLIT_DEV_DOMAIN?.trim();
    if (replitDevDomain) {
      origins.add(`https://${replitDevDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`);
    }
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
  }
  return origins;
}

export function isTrustedOrigin(origin: string): boolean {
  return configuredOrigins().has(origin.replace(/\/$/, ""));
}

function originFromReferer(referer: string | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function hasTrustedMutationOrigin(req: Request): boolean {
  const origin = req.get("origin") ?? originFromReferer(req.get("referer"));
  if (!origin) return false;
  if (isTrustedOrigin(origin)) return true;
  const host = req.get("host");
  return Boolean(host && origin === `${req.protocol}://${host}`);
}