---
name: Advertiser report snapshots
description: Design rule for public advertiser performance links
---

Public advertiser report links must serve an immutable snapshot containing only campaign-level consented metrics, reporting dates, daily aggregates, and placement aggregates.

**Why:** A shared report should remain stable for the recipient and must not expose new activity, internal dashboard data, or personal/account identifiers after it is generated.

**How to apply:** Generate and store the report payload server-side, keep public access token-based and expiring, and never make the public endpoint query the full analytics summary or raw event data.