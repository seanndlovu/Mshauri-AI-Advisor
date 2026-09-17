import { Router, type IRouter } from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { adsTable, adAnalyticsEventsTable, db, privacyPreferencesTable, type Ad } from "@workspace/db";
import { requireAdAdmin } from "../lib/admin-access";
import { getVerifiedClerkUser } from "../lib/current-user";
import { hasTrustedMutationOrigin } from "../lib/trusted-origins";
const AD_PLACEMENT = "sidebar_square" as const;
const MAX_AD_UPLOAD_BYTES = 5 * 1024 * 1024;
const AD_UPLOAD_DIR = process.env.ADS_UPLOAD_DIR ?? path.join(process.cwd(), "uploads", "ads");
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
export type AdsDatabase = Pick<typeof db, "select" | "insert" | "update" | "delete">;
export type AdsRouterOptions = {
  database?: AdsDatabase;
  requireAdAdmin?: typeof requireAdAdmin;
};

type AdInput = Partial<Pick<Ad, "name" | "advertiserName" | "targetUrl" | "imageUrl" | "altText" | "placement" | "status">> & {
  billingModel?: "flat" | "cpm" | "cpc";
  currency?: string;
  rateCents?: number | null;
  budgetCents?: number | null;
  startDate?: string | null;
  endDate?: string | null;
};

function formatAd(ad: Ad) {
  return {
    ...ad,
    createdAt: ad.createdAt.toISOString(),
    updatedAt: ad.updatedAt.toISOString(),
  };
}

function isCalendarDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value;
}

function isWebUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isHostedAdPath(value: string | null | undefined): value is string {
  return Boolean(value && /^\/api\/ads\/uploads\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/i.test(value));
}

function isExpectedImageFile(bytes: Buffer, contentType: string): boolean {
  if (contentType === "image/png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return bytes.length >= 12
    && bytes.subarray(0, 4).equals(Buffer.from("RIFF"))
    && bytes.subarray(8, 12).equals(Buffer.from("WEBP"));
}

function parseId(value: string | string[] | undefined): number | null {
  const id = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function editableDate(input: AdInput, field: "startDate" | "endDate", existing: Ad | undefined): string | null {
  if (Object.prototype.hasOwnProperty.call(input, field)) {
    return input[field] || null;
  }
  return existing?.[field] ?? null;
}

function validateAd(input: AdInput, existing?: Ad): { value?: Omit<Ad, "id" | "createdBy" | "createdAt" | "updatedAt">; error?: string } {
  const value = {
    name: input.name?.trim() ?? existing?.name ?? "",
    advertiserName: input.advertiserName?.trim() ?? existing?.advertiserName ?? "",
    targetUrl: input.targetUrl?.trim() ?? existing?.targetUrl ?? "",
    imageUrl: input.imageUrl?.trim() ?? existing?.imageUrl ?? "",
    altText: input.altText?.trim() ?? existing?.altText ?? "",
    placement: input.placement ?? existing?.placement ?? AD_PLACEMENT,
    status: input.status ?? existing?.status ?? "draft",
    billingModel: input.billingModel ?? existing?.billingModel ?? "flat",
    currency: input.currency?.trim().toUpperCase() ?? existing?.currency ?? "USD",
    rateCents: input.rateCents ?? existing?.rateCents ?? null,
    budgetCents: input.budgetCents ?? existing?.budgetCents ?? null,
    startDate: editableDate(input, "startDate", existing),
    endDate: editableDate(input, "endDate", existing),
  };

  if (!value.name || !value.advertiserName || !value.altText) return { error: "Campaign name, advertiser name, and accessible image description are required." };
  if (!isWebUrl(value.targetUrl) || (!isWebUrl(value.imageUrl) && !isHostedAdPath(value.imageUrl))) return { error: "Use a complete destination URL and upload a valid advert image." };
  if (value.placement !== AD_PLACEMENT) return { error: "Only the 250 × 250 sidebar-square creative is supported." };
  if (!["draft", "active", "paused", "expired"].includes(value.status)) return { error: "Invalid campaign status." };
  if (!["flat", "cpm", "cpc"].includes(value.billingModel)) return { error: "Invalid billing model." };
  if (!/^[A-Z]{3}$/.test(value.currency)) return { error: "Currency must be a three-letter code such as USD." };
  if (value.rateCents !== null && (!Number.isInteger(value.rateCents) || value.rateCents < 0)) return { error: "Rate must be a non-negative whole number of cents." };
  if (value.budgetCents !== null && (!Number.isInteger(value.budgetCents) || value.budgetCents < 0)) return { error: "Budget must be a non-negative whole number of cents." };
  if ((value.startDate && !isCalendarDate(value.startDate)) || (value.endDate && !isCalendarDate(value.endDate))) {
    return { error: "Campaign dates must use YYYY-MM-DD." };
  }
  if (value.startDate && value.endDate && value.startDate > value.endDate) return { error: "The end date cannot be before the start date." };
  return { value };
}

export function createAdsRouter(options: AdsRouterOptions = {}): IRouter {
  const database = options.database ?? db;
  const authorizeAdAdmin = options.requireAdAdmin ?? requireAdAdmin;
  const router: IRouter = Router();

router.use("/admin/ads", (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }
  if (!hasTrustedMutationOrigin(req)) {
    res.status(403).json({ error: "This request must come from the trusted Mshauri application." });
    return;
  }
  next();
});

router.get("/ads", async (req, res): Promise<void> => {
  const placement = typeof req.query.placement === "string" ? req.query.placement : AD_PLACEMENT;
  if (placement !== AD_PLACEMENT) {
    res.status(400).json({ error: "Unsupported ad placement." });
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const active = (await database.select().from(adsTable).where(eq(adsTable.status, "active")).orderBy(desc(adsTable.updatedAt)))
    .filter((ad) => (!ad.startDate || ad.startDate <= today) && (!ad.endDate || ad.endDate >= today))
    .filter((ad) => ad.placement === placement);
  res.json({ ad: active[0] ? formatAd(active[0]) : null, specification: { creative: "250x250", display: "217x217" } });
});

router.post("/ads/events", async (req, res): Promise<void> => {
  if (!hasTrustedMutationOrigin(req)) {
    res.status(403).json({ error: "This request must come from the trusted Mshauri application." });
    return;
  }

  const user = await getVerifiedClerkUser(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const body = req.body as {
    adId?: unknown;
    eventType?: unknown;
    placement?: unknown;
    pagePath?: unknown;
    visitorToken?: unknown;
  };
  const adId = typeof body.adId === "number" && Number.isInteger(body.adId) ? body.adId : null;
  if (
    adId === null
    || (body.eventType !== "impression" && body.eventType !== "click")
    || body.placement !== AD_PLACEMENT
    || typeof body.pagePath !== "string"
    || !body.pagePath.startsWith("/")
    || body.pagePath.length > 200
    || typeof body.visitorToken !== "string"
    || !/^[a-zA-Z0-9_-]{20,128}$/.test(body.visitorToken)
  ) {
    res.status(400).json({ error: "Unsupported advert analytics event." });
    return;
  }

  const [preferences] = await db
    .select({ analyticsConsent: privacyPreferencesTable.analyticsConsent })
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

  const [ad] = await db
    .select({ id: adsTable.id, startDate: adsTable.startDate, endDate: adsTable.endDate })
    .from(adsTable)
    .where(and(
      eq(adsTable.id, adId),
      eq(adsTable.status, "active"),
    ))
    .limit(1);
  const today = new Date().toISOString().slice(0, 10);
  if (!ad || (ad.startDate && ad.startDate > today) || (ad.endDate && ad.endDate < today)) {
    res.status(204).end();
    return;
  }

  await db.insert(adAnalyticsEventsTable).values({
    adId: ad.id,
    eventType: body.eventType,
    placement: body.placement,
    pagePath: body.pagePath,
    visitorToken: body.visitorToken,
  });
  res.status(204).end();
});

router.get("/ads/uploads/:fileName", async (req, res): Promise<void> => {
  const fileName = Array.isArray(req.params.fileName) ? req.params.fileName[0] : req.params.fileName;
  if (!/^[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/i.test(fileName ?? "")) {
    res.status(404).end();
    return;
  }
  try {
    await fs.access(path.join(AD_UPLOAD_DIR, fileName));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.sendFile(fileName, { root: AD_UPLOAD_DIR });
  } catch {
    res.status(404).end();
  }
});

router.get("/admin/ads", async (req, res): Promise<void> => {
  const user = await authorizeAdAdmin(req, res);
  if (!user) return;
  const ads = await database.select().from(adsTable).orderBy(desc(adsTable.updatedAt));
  res.json({ ads: ads.map(formatAd), specification: { creative: "250x250", display: "217x217" } });
});

router.post("/admin/ads", async (req, res): Promise<void> => {
  const user = await authorizeAdAdmin(req, res);
  if (!user) return;
  const validated = validateAd(req.body as AdInput);
  if (!validated.value) {
    res.status(400).json({ error: validated.error });
    return;
  }
  const [ad] = await database.insert(adsTable).values({ ...validated.value, createdBy: user.id }).returning();
  res.status(201).json({ ad: formatAd(ad!) });
});

router.post("/admin/ads/upload", async (req, res): Promise<void> => {
  const user = await authorizeAdAdmin(req, res);
  if (!user) return;
  const body = req.body as { fileName?: string; contentType?: string; data?: string };
  const contentType = body.contentType?.toLowerCase() ?? "";
  if (!ALLOWED_IMAGE_TYPES.has(contentType) || !body.data) {
    res.status(400).json({ error: "Upload a PNG, JPEG, or WebP advert image." });
    return;
  }
  const rawData = body.data.replace(/^data:[^;]+;base64,/, "");
  let bytes: Buffer;
  try {
    bytes = Buffer.from(rawData, "base64");
  } catch {
    res.status(400).json({ error: "The advert image could not be read." });
    return;
  }
  if (!bytes.length || bytes.length > MAX_AD_UPLOAD_BYTES) {
    res.status(400).json({ error: "Advert images must be smaller than 5 MB." });
    return;
  }
  if (!isExpectedImageFile(bytes, contentType)) {
    res.status(400).json({ error: "The uploaded file does not match its selected image format." });
    return;
  }
  const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
  const fileName = `${randomUUID()}-${(body.fileName ?? "advert").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "advert"}.${extension}`;
  await fs.mkdir(AD_UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(AD_UPLOAD_DIR, fileName), bytes, { flag: "wx" });
  res.status(201).json({ imageUrl: `/api/ads/uploads/${fileName}` });
});

router.patch("/admin/ads/:id", async (req, res): Promise<void> => {
  const user = await authorizeAdAdmin(req, res);
  if (!user) return;
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid campaign." });
    return;
  }
  const [existing] = await database.select().from(adsTable).where(eq(adsTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Campaign not found." });
    return;
  }
  const validated = validateAd(req.body as AdInput, existing);
  if (!validated.value) {
    res.status(400).json({ error: validated.error });
    return;
  }
  const [ad] = await database.update(adsTable).set({ ...validated.value, updatedAt: new Date() }).where(eq(adsTable.id, id)).returning();
  res.json({ ad: formatAd(ad!) });
});

router.delete("/admin/ads/:id", async (req, res): Promise<void> => {
  const user = await authorizeAdAdmin(req, res);
  if (!user) return;
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid campaign." });
    return;
  }
  await database.delete(adsTable).where(eq(adsTable.id, id));
  res.sendStatus(204);
});

  return router;
}

const router = createAdsRouter();
export { router as adsRouter };