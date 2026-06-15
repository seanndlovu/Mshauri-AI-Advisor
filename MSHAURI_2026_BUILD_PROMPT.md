# Mshauri 2026 — Master Build Prompt (Replit-Ready)

You are a senior full-stack engineer building on an existing production codebase.
Do NOT start from scratch. Extend and refactor what exists.
Work in phases. Ship each phase before starting the next.

---

## Current Stack (do not change)

- **Runtime**: Node 24, TypeScript, pnpm workspaces
- **API**: Express 5 + express-session, port 8080, all routes under `/api`
- **DB**: PostgreSQL + Drizzle ORM — schema in `lib/db/src/schema/`
- **Frontend**: React + Vite + Tailwind + shadcn/ui + Wouter — in `artifacts/mhauri-ai/`
- **AI**: OpenAI GPT-4o via `OPENAI_API_KEY`
- **Auth**: bcrypt + express-session, cookie-based

---

## What Already Exists (do not re-implement)

- ✅ 4-tab navigation: **Home / Mshauri / Markets / Me** (`AppLayout.tsx`)
- ✅ Animal-Number anonymous identity (e.g. `Shumba-482`) stored in `posts.author_name`
- ✅ No WhatsApp in nav — WhatsApp is a backend channel only
- ✅ Community creation removed from UI
- ✅ Guest posting and commenting (no login required)
- ✅ AI chat at `/ask` via GPT-4o streaming (`Home.tsx`, `chat.ts` route)
- ✅ Market prices page at `/prices` (`MarketPrices.tsx`, Google Sheets CSV source)
- ✅ 16 pre-seeded communities in DB (crops, livestock, maize, pests, soils, faq, machinery…)
- ✅ Friendly 404 page with "Page unavailable" + Return Home

---

## Product Mission

> A farmer opens Mshauri, describes their problem in plain language (text, voice, or photo), and immediately receives useful, trusted, localized agricultural guidance — without ever thinking about how the platform is organized.

The AI is the front door.  
The community is supporting evidence.  
Weather and markets are context, not destinations.

---

## Phase 2 — Visual Redesign & Remove Reddit Mechanics

### 2A. Remove upvote/downvote UI

**Files to change:**
- `artifacts/mhauri-ai/src/pages/Feed.tsx`
- `artifacts/mhauri-ai/src/pages/CommunityFeed.tsx`
- `artifacts/mhauri-ai/src/pages/PostDetail.tsx`

Remove all upvote (▲) and downvote (▼) buttons and vote counts from post cards and post detail views.

Replace the vote count display with a **"Helpful"** count using the existing `upvotes` column as the backing value (rename display only, no DB migration needed yet).

Remove the **Hot / New / Top** sort tabs from Feed and CommunityFeed.  
Replace with a single **Most Helpful | Recent** toggle (two options only).  
`Most Helpful` = `ORDER BY upvotes DESC`.  
`Recent` = `ORDER BY created_at DESC`.

Remove the upvote/downvote API calls from the frontend. The backend endpoints can remain for now.

### 2B. Post card redesign — calm, minimal, information-dense

Each post card should show:
```
[Type badge]  u/Shumba-482 · 2 days ago · 📍 Harare
Title (large, bold)
Content preview (2 lines, truncated)
──────────────────────────────────────
💬 4 replies   👍 12 helpful   [Share]
```

Design rules:
- Background: `#16181C`, border: `#2F3336`, border-radius: `16px`
- Title: `text-[#E7E9EA]` 16px bold
- Meta line: `text-[#71767B]` 12px
- Type badges: keep existing color-coded badges (Question = blue, Disease Alert = red, Success Story = green, etc.)
- No upvote/downvote arrows — remove completely
- Tap entire card to open post (not just the title)

### 2C. Feed layout — remove right sidebar community list

On the Feed page (`Feed.tsx`), the right sidebar currently shows "Top Communities" and "Browse by Topic" tags.

**Keep:** Market Snapshot widget (right sidebar, top)  
**Keep:** "Ask Mshauri AI →" CTA button  
**Remove:** Top Communities list (communities are a backend concept now)  
**Remove:** Browse by Topic tag cloud  
**Replace removed space with:** A "Recent Activity" count — "1,204 farmers online today" static display

### 2D. Design language

Apply these consistently across all pages:

| Token | Value |
|---|---|
| Background | `#0f1011` (slightly darker than current `#1a1a1b`) |
| Surface | `#16181C` |
| Border | `#2F3336` |
| Primary text | `#E7E9EA` |
| Muted text | `#71767B` |
| Accent | `#22c55e` |
| Danger | `#ef4444` |
| Font weight (headings) | 700–900 |
| Border radius (cards) | 16px |
| Border radius (buttons) | 9999px (pill) |

Spacing: generous. Min 16px padding inside cards. Min 12px gap between cards.  
Typography: Large headings. Tight line-height (1.2) for titles.

---

## Phase 3 — Mshauri AI Screen (The Heart of the Product)

**File:** `artifacts/mhauri-ai/src/pages/Home.tsx`  
**Route:** `/ask`

### 3A. New Mshauri screen layout

Replace the current chat-list sidebar layout with a single full-screen AI prompt experience:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   🌿  What can Mshauri help you with today?         │
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │  Describe your farming situation...         │   │
│   │                                             │   │
│   │                              [🎤] [📷] [→]  │   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
│   Try asking:                                       │
│   "My maize leaves are turning yellow"              │
│   "Should I sell tomatoes today?"                   │
│   "What disease is affecting my cattle?"            │
│   "Will rainfall affect planting next week?"        │
│                                                     │
│   ── Recent conversations ──────────────────────── │
│   [Previous chat titles listed below]               │
└─────────────────────────────────────────────────────┘
```

Design:
- Full page, centered content, max-width 680px
- Large textarea (min 120px tall, grows with content)
- Submit button: green pill "Ask Mshauri →" right-aligned inside textarea
- Voice button (🎤): triggers `window.SpeechRecognition` if available, else shows "Voice not available on this device"
- Photo button (📷): opens file picker, accepts `image/*`, converts to base64, appends to message context (GPT-4o vision already supported)
- Example prompts: clickable chips — clicking fills the textarea

### 3B. Conversation view (no changes needed to streaming logic)

The existing GPT-4o streaming in `artifacts/api-server/src/routes/chat.ts` works correctly. Keep it.  
The existing `Conversation.tsx` page works. Keep it.

After the user submits a question:
1. Create a new conversation via `POST /api/conversations`
2. Navigate to `/conversations/:id`
3. Stream the AI response as it currently works

### 3C. Auto-categorization (new backend feature)

After an AI answer is generated, silently classify the question in the background.

Add to `artifacts/api-server/src/routes/chat.ts` — after the stream completes, fire-and-forget:

```typescript
// After streaming ends:
openai.chat.completions.create({
  model: "gpt-4o-mini",  // cheap, fast
  messages: [{
    role: "user",
    content: `Classify this farming question into ONE category: maize, livestock, vegetables, poultry, pests, soils, irrigation, agribusiness, climate, crops, machinery, diseases, faq\n\nQuestion: "${userMessage}"\n\nRespond with only the category word.`
  }]
}).then(r => {
  const category = r.choices[0]?.message?.content?.trim().toLowerCase();
  // Update conversation record with category tag
  db.update(conversationsTable).set({ title: category }).where(eq(conversationsTable.id, conversationId));
}).catch(() => {});  // silent failure
```

This is background-only. Do not block the stream. Do not surface the category to the user.

---

## Phase 4 — Home Dashboard ("What should I know right now?")

**File:** `artifacts/mhauri-ai/src/pages/Feed.tsx`  
**Route:** `/`

### 4A. Home page structure

The Home page should have three sections:

**Section 1: Situational Awareness Strip** (horizontal scrollable cards, mobile-first)
- Weather card: current conditions for Zimbabwe (use Open-Meteo API, Harare coordinates as default: lat=-17.83, lon=31.05). Show: temperature, rain chance, 1-line advice e.g. "Good planting conditions today"
- Top market mover card: highest % change from `market_prices` table. Show: crop name, price, % change arrow
- Community pulse card: post count in last 24h. Show: "32 new discussions today"

Each card: 160px wide, 80px tall, rounded-2xl, green accent border-left.

**Section 2: Priority Discussions** (replaces generic feed)

Fetch posts with `ORDER BY upvotes DESC, created_at DESC LIMIT 10`.  
Label this section: **"Most Helpful Discussions"** not "Feed".  
Use the new post card design from Phase 2B.

**Section 3: Ask Mshauri CTA** (sticky at bottom on mobile, inline on desktop)

```
┌──────────────────────────────────────────────────┐
│  🌿  Have a farming question?                    │
│  [Ask Mshauri AI →]                              │
└──────────────────────────────────────────────────┘
```

### 4B. Remove from Home page
- ❌ "Share your agricultural knowledge..." post composer bar at the top — move posting to a dedicated "Create Post" modal triggered from the sidebar button only
- ❌ Hot / New / Top tabs (already handled in Phase 2A)
- ❌ Right sidebar "Top Communities" list

---

## Phase 5 — Me Page (Profile)

**File:** `artifacts/mhauri-ai/src/pages/Profile.tsx`  
**Route:** `/me` (already wired in `App.tsx`)

### Rename and restructure

Page title: **"Me"** not "Profile"

**For logged-in users, show:**
1. Anonymous identity display: `🦁 Shumba-482` (large, centered, top of page)
2. Role badge (Farmer / Extension Officer / Agribusiness / Researcher / NGO)
3. Location
4. Stats row: `Questions Asked | Helpful Answers | Reputation`
5. Settings section: Language preference (English / Shona / Ndebele), Location update, Role update
6. Sign Out button (red, bottom)

**Remove from profile:**
- ❌ Real name display (name field stays in DB for internal use, do not show publicly)
- ❌ Email display
- ❌ "Edit Profile" form showing name/email

**For guests (not logged in):**
```
You're browsing as a guest.
Sign in to save your conversations, 
track your questions, and build your reputation.

[Sign In]  [Create Account]
```

---

## Phase 6 — Markets Redesign

**File:** `artifacts/mhauri-ai/src/pages/MarketPrices.tsx`  
**Route:** `/prices`

### Current issues
- Table is dense and hard to scan on mobile
- No visual trend indicators
- No buy/sell signals

### New design: card grid

Replace the table with a **2-column card grid** (1-column on mobile):

```
┌──────────────────┐  ┌──────────────────┐
│ 🌽 Maize         │  │ 🍅 Tomatoes       │
│ $0.28/kg         │  │ $0.45/kg         │
│ ▲ +3% this week  │  │ ▲ +15% this week │
│ [Good to sell]   │  │ [Strong demand]  │
└──────────────────┘  └──────────────────┘
```

Each card:
- Crop emoji + name (bold 16px)
- Price (bold 22px, primary text)
- % change with colored arrow: green ▲ for positive, red ▼ for negative
- Signal badge: 
  - `+10% or more` → `🟢 Strong demand`
  - `+3% to +10%` → `🟡 Good to sell`  
  - `-3% to +3%` → `⚪ Hold`
  - `-3% or less` → `🔴 Wait`
- Last updated timestamp

Keep the existing Google Sheets CSV data source. Add the signal computation in the frontend using the existing `change` field.

Keep the category filter tabs (All, Grains, Vegetables, etc.) at the top.

---

## DB Schema Notes

Do NOT drop any existing columns. Only add.

If you need to track "helpful" counts separately from upvotes in future, add:
```sql
ALTER TABLE posts ADD COLUMN IF NOT EXISTS helpful_count integer NOT NULL DEFAULT 0;
```
For now, reuse `upvotes` column as the helpful count. Display it as "helpful", not "upvotes".

The `community_id` column on `posts` is NOT NULL with a FK constraint.  
Do NOT remove it. Communities remain as backend organizational structure.  
When creating posts without user-selected community, default to community ID 1 (General/Crops).

---

## API Constraints

- All API routes are under `/api` — do not change this prefix
- Session cookie is httpOnly, secure in production — do not change auth mechanism
- Market prices route: `GET /api/market-prices` — returns array from Google Sheets CSV
- Chat route: `POST /api/chat` + `GET /api/chat/stream/:id` — do not refactor streaming logic
- Communities route: `GET /api/communities` — keep, used for Create Post modal dropdown

---

## What NOT to Change

- ❌ Do not change the Express route structure or session auth
- ❌ Do not change the Drizzle schema file without running `pnpm --filter @workspace/db run push`
- ❌ Do not remove the `/communities/:slug` route — deep links to communities still work
- ❌ Do not change the OpenAI streaming implementation
- ❌ Do not remove login/register pages — they are still needed for account creation
- ❌ Do not change the WhatsApp webhook routes — WhatsApp bot runs in production

---

## Acceptance Criteria (test before shipping each phase)

### Phase 2
- [ ] No upvote/downvote buttons visible anywhere
- [ ] Post cards show "helpful" count (not vote count)
- [ ] Feed has "Most Helpful | Recent" toggle only
- [ ] Top Communities list removed from right sidebar
- [ ] Cards are visually calm, minimal, not Reddit-like

### Phase 3
- [ ] `/ask` shows large prompt box, 4 example chips, recent chats below
- [ ] Submitting a question navigates to `/conversations/:id` and streams
- [ ] Photo upload button visible (functionality can be in-progress)
- [ ] Voice button visible (graceful fallback if browser doesn't support)

### Phase 4
- [ ] Home shows weather strip, top market mover, and post count
- [ ] Post composer bar removed from top of Home feed
- [ ] Section titled "Most Helpful Discussions" not "Feed"

### Phase 5
- [ ] `/me` shows anonymous identity as `Animal-Number` not real name
- [ ] Real name and email NOT displayed to user
- [ ] Guest view shows sign-in prompt

### Phase 6
- [ ] Markets shows card grid, not table
- [ ] Each card has % change arrow in correct color
- [ ] Signal badge logic is correct (Strong demand / Good to sell / Hold / Wait)
- [ ] Category filter tabs still work

---

## Execution Order

1. Phase 2 (visual + Reddit removal) — highest visible impact, lowest risk
2. Phase 3 (Mshauri AI screen) — core product heart
3. Phase 5 (Me page) — quick, high privacy value
4. Phase 6 (Markets cards) — standalone page, no dependencies
5. Phase 4 (Home dashboard) — requires Phases 2 + 6 to be done first

Run `pnpm --filter @workspace/api-server run typecheck` and `pnpm --filter @workspace/mhauri-ai run typecheck` after each phase before proceeding.

---

*Built by Maricho Media. Stack: Express 5 · PostgreSQL · Drizzle · React · Vite · Tailwind · GPT-4o*
