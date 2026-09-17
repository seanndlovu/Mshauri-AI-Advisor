import { and, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { anonymousUsageEventsTable, db, privacyPreferencesTable } from "@workspace/db";
import { getVerifiedClerkUser } from "../lib/current-user";

const router: IRouter = Router();
const CONSENT_VERSION = "2026-09-17";
const FEATURES = new Set([
  "home",
  "feed",
  "magazine",
  "prices",
  "weather",
  "communities",
  "community",
  "conversation",
  "profile",
  "farmers",
  "broadcasts",
  "analytics",
  "whatsapp",
]);

function preferencesResponse(preferences: typeof privacyPreferencesTable.$inferSelect | undefined) {
  return {
    analyticsConsent: preferences?.analyticsConsent ?? false,
    marketingConsent: preferences?.marketingConsent ?? false,
    consentVersion: preferences?.consentVersion ?? CONSENT_VERSION,
    updatedAt: preferences?.updatedAt ?? null,
    hasSavedPreferences: Boolean(preferences),
  };
}

router.get("/privacy/preferences", async (req, res): Promise<void> => {
  const user = await getVerifiedClerkUser(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [preferences] = await db
    .select()
    .from(privacyPreferencesTable)
    .where(eq(privacyPreferencesTable.userId, user.id))
    .limit(1);

  res.json(preferencesResponse(preferences));
});

router.patch("/privacy/preferences", async (req, res): Promise<void> => {
  const user = await getVerifiedClerkUser(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { analyticsConsent, marketingConsent } = req.body as {
    analyticsConsent?: unknown;
    marketingConsent?: unknown;
  };

  if (typeof analyticsConsent !== "boolean" || typeof marketingConsent !== "boolean") {
    res.status(400).json({ error: "Analytics and marketing choices are required." });
    return;
  }

  const values = {
    userId: user.id,
    analyticsConsent,
    marketingConsent,
    consentVersion: CONSENT_VERSION,
  };

  const [existing] = await db
    .select()
    .from(privacyPreferencesTable)
    .where(eq(privacyPreferencesTable.userId, user.id))
    .limit(1);

  const [preferences] = existing
    ? await db
      .update(privacyPreferencesTable)
      .set({
        analyticsConsent,
        marketingConsent,
        consentVersion: CONSENT_VERSION,
        updatedAt: new Date(),
      })
      .where(eq(privacyPreferencesTable.userId, user.id))
      .returning()
    : await db
      .insert(privacyPreferencesTable)
      .values(values)
      .returning();

  res.json(preferencesResponse(preferences));
});

router.post("/privacy/usage-events", async (req, res): Promise<void> => {
  const user = await getVerifiedClerkUser(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { eventType, feature } = req.body as {
    eventType?: unknown;
    feature?: unknown;
  };

  if ((eventType !== "page_view" && eventType !== "feature_used")
    || typeof feature !== "string"
    || !FEATURES.has(feature)) {
    res.status(400).json({ error: "Unsupported analytics event." });
    return;
  }

  const [preferences] = await db
    .select()
    .from(privacyPreferencesTable)
    .where(and(
      eq(privacyPreferencesTable.userId, user.id),
      eq(privacyPreferencesTable.analyticsConsent, true),
    ))
    .limit(1);

  if (!preferences) {
    res.status(204).end();
    return;
  }

  await db.insert(anonymousUsageEventsTable).values({ eventType, feature });
  res.status(204).end();
});

export default router;