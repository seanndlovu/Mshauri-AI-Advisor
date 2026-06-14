# Mshauri — AI Agricultural Assistant for Zimbabwe

Community-powered agricultural intelligence platform for Zimbabwean farmers, built by Maricho Media.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/mhauri-ai run dev` — run the frontend (port varies)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed:community` — seed 10 communities, demo users, 32 posts, 69 comments
- Required env: `DATABASE_URL`, `OPENAI_API_KEY`, `SESSION_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + express-session (bcryptjs auth)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite + Tailwind + shadcn/ui + Wouter
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — DB schema (conversations, farmers, market-prices, users, community)
- `artifacts/api-server/src/routes/` — API routes (auth, communities, posts, whatsapp, chat, etc.)
- `artifacts/mhauri-ai/src/pages/` — Frontend pages (Feed, Communities, CommunityFeed, PostDetail, Login, Register, Profile, Home/Ask AI, MarketPrices)
- `artifacts/mhauri-ai/src/hooks/use-auth.ts` — Global singleton auth state
- `scripts/src/seed-community.ts` — Demo data seed (uses raw pg, not drizzle)

## Architecture decisions

- Community platform uses Reddit-style r/slug structure with typed posts (question, disease_report, market_price, opportunity, success_story, weather)
- Auth uses express-session (httpOnly cookies) + bcrypt; session userId stored server-side
- New community/auth/posts routes added directly (not via OpenAPI spec codegen) — frontend calls them via raw fetch
- Seed script uses raw `pg` (not `@workspace/db`) to avoid transitive dependency resolution issues in tsx
- Home (/) = community feed; Ask AI (/ask) = AI chat; original admin routes preserved under sidebar Admin section

## Product

- **Community Feed** — Reddit-style post feed with type badges, upvoting, sort by new/top, filter by post type
- **Communities** — 10 farming communities (maize, livestock, vegetables, poultry, tobacco, pests, irrigation, agribusiness, climate, soils)
- **Ask AI** — GPT-4o powered chat for agricultural questions (streaming)
- **Market Prices** — Price monitoring across Zimbabwe
- **WhatsApp Bot** — Automated farming advice via WhatsApp
- **Auth** — Register/login with role (farmer, extension_officer, agribusiness, researcher, ngo) and location

## Demo Accounts

- tendai@demo.zw / demo1234 (Farmer, Harare)
- chipo@demo.zw / demo1234 (Extension Officer, Bulawayo)
- farai@demo.zw / demo1234 (Agribusiness, Mutare)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- WhatsApp token: read dynamically at request time via `getWhatsAppConfig()` — needs a never-expiring System User token from business.facebook.com
- `pnpm --filter @workspace/scripts run seed:community` will skip duplicate emails/slugs on re-run (uses ON CONFLICT DO NOTHING/UPDATE)
- Seed script uses raw `pg` not drizzle — because tsx can't resolve transitive workspace deps (drizzle-orm, pg) from scripts package
- `express-session` cookie is `secure: true` in production, `sameSite: none` — requires HTTPS (Replit deployed domains are HTTPS automatically)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
