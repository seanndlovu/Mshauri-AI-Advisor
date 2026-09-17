# Mshauri advertiser performance report

## Recommendation

Treat the report as a compact, print-first document rather than a second analytics dashboard. Keep the existing `/analytics` page as the Owner's working surface; add one focused action, **Generate report**, in the existing analytics header. The generated report opens in a separate read-only route and can be copied as a public link or printed.

Use the current Mshauri language: quiet green, warm off-white, modest borders, practical labels, and restrained data density. The report should feel suitable for sending to an advertiser without exposing any internal product analytics.

## Routing and access

- Keep `/analytics` private and inside `AppLayout`, alongside the current Owner-only analytics surface.
- Add a public, read-only route such as `/reports/:token` **before** the authenticated `AppLayout` route in `App.tsx`. This prevents the share link from inheriting the Owner navigation or requiring Clerk.
- The report route renders only report data returned for its token. It must not fetch the full analytics summary, conversations, farmers, language breakdown, feature usage, or account data.
- The public page has no edit, refresh, export-data, or navigation controls. Its only utility actions are **Print / Save as PDF** and **Copy link** when the viewer is the Owner's report-management context; the public view itself needs only Print.
- A missing, expired, revoked, or malformed token should render a composed “Report unavailable” page with the Mshauri mark and a short explanation. Do not leak whether a campaign or advertiser exists.

## Owner flow from Analytics

1. In the existing “Advert performance” or “Campaign results” area, add a single secondary action: **Generate report**.
2. The action opens a compact confirmation panel, not a large wizard:
   - campaign selector, defaulting to the selected campaign when one is evident;
   - reporting period, defaulting to the current Analytics range;
   - visible preview of campaign name, advertiser, and date range;
   - plain-language privacy note: “This report contains consent-based, aggregated advertising metrics only. It never includes personal or conversation data.”
3. Submit creates the report snapshot and opens the read-only report route. Treat the snapshot as immutable so a shared report does not silently change after generation.
4. On the report view, show **Copy public link** with a clear “Copied” confirmation. Keep this as a lightweight action; do not introduce a report library, scheduling, recipient management, or multi-report workflow.
5. If generation fails, keep the panel open, show an inline error, and offer **Try again**. Do not display a blank report shell.

## Report hierarchy

Use a centered document canvas, approximately 840–960px wide on screen, with generous page margins and a white/cream paper treatment. The screen toolbar sits outside the paper; it is hidden in print.

### 1. Report masthead

- Mshauri wordmark or mark at left; small “Advertiser performance report” eyebrow.
- Large campaign name as the title.
- Advertiser name and reporting period directly beneath.
- Right-side metadata: “Generated [date]” and a small **Read-only** label.
- A short privacy statement immediately below the masthead, visually distinct but not alarming:
  “Metrics are consent-based and aggregated. This report contains no personal, farmer, account, or conversation data.”

### 2. Executive metric band

One horizontal band on desktop, two columns on mobile. Use exactly the requested report metrics and make the definitions explicit:

- Impressions
- Measured reach
- Clicks
- CTR
- Estimated value

Each metric gets a concise label, a prominent value, and no decorative icon dependency. Under the band, include one footnote:
“Measured reach is an aggregated estimate of consented unique exposure and is not a count of identified people.”

### 3. Daily performance

- Section title: **Daily performance**
- One clean chart with impressions as the primary series and clicks as a lighter secondary marker or line. Avoid a dashboard-style chart grid.
- X-axis uses a small number of date labels; tooltip behavior is useful on screen but irrelevant in print, so include a compact accessible data table beneath the chart or a print-only table.
- Print output should preserve the chart's visual trend and include the exact daily rows.
- Empty state: “No consented delivery was recorded during this reporting period.” Do not fabricate zero-filled activity unless the API explicitly supplies those dates.

### 4. Placement and page performance

- Section title: **Placement and page performance**
- A table with columns: Placement, Page, Impressions, Clicks, CTR.
- Keep page values human-readable and safely truncated on screen with the full value available to assistive technology; do not expose query strings or user identifiers.
- Sort by impressions descending by default. This is presentation ordering only, not a new filtering feature.
- Repeat the table header when printed across pages.

### 5. Closing data note

End the document with a quiet footer:

“Prepared by Mshauri. Advertising measurements are derived from consented, aggregated events. Mshauri does not share personal data, farmer identities, message content, or conversation history in this report.”

Include the report token's generated date, not an internal database ID. Keep the Mshauri privacy and contact link only if an existing public privacy route is already appropriate.

## Interaction and responsive behavior

- Desktop: toolbar above paper; report remains a single vertical reading flow.
- Mobile: toolbar actions stack or become full-width; metric band becomes a two-column grid; tables scroll horizontally without collapsing labels.
- Print: use a dedicated print stylesheet. Hide all toolbar buttons, remove shadows/background decoration, preserve green accents as dark ink-friendly tones, set page margins, and avoid splitting metric cards or table rows.
- Never use hover-only meaning. All values and definitions must remain visible or available through accessible text.
- Use skeleton blocks while the snapshot loads. A failed request gets the unavailable state; a valid report with no campaign activity gets an explicit empty section.

## Data boundary

The report payload should be limited to:

- campaign name
- advertiser name
- reporting period
- impressions
- measured reach
- clicks
- CTR
- estimated value and currency
- daily performance rows
- placement/page performance rows
- generated timestamp

Do not include total messages, active farmers, language breakdown, feature interest, event types, account identifiers, conversation identifiers, message text, page-level personal identifiers, or any raw event payload. The public endpoint should enforce this boundary server-side; hiding fields in the client is insufficient.

## Visual direction

**Layout paradigm:** editorial report sheet inside a utility shell.  
**Mood:** calm agritech briefing — trustworthy, legible, and intentionally restrained.  
**Palette:** retain Mshauri's existing green/off-white tokens; use the deep green for titles and rules, a pale green wash for the privacy notice and metric band, and a muted amber only for estimated value emphasis if needed.  
**Typography:** keep the app's existing sans-serif system for consistency, with tabular numerals for metrics. Avoid adding a new display font for this narrow surface.  
**Motion:** no animation in the report itself; use only a short opacity/transform reveal when the Owner opens a generated snapshot. Print and readability take priority.

## Scope guard

This surface needs only report generation, immutable read-only rendering, public-link copying, print/save-to-PDF, loading/error/empty states, and the documented privacy boundary. Do not add report scheduling, recipient lists, campaign editing, comparison periods, commentary fields, export formats beyond the browser's print flow, or a report-management dashboard.