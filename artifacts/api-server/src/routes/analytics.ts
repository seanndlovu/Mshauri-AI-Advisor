import { Router, type IRouter } from "express";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, gte, isNull, sql } from "drizzle-orm";
import {
  adAnalyticsEventsTable,
  adsTable,
  advertiserReportsTable,
  anonymousUsageEventsTable,
  analyticsEventsTable,
  db,
  farmersTable,
} from "@workspace/db";
import { requireOwner } from "../lib/admin-access";
import { hasTrustedMutationOrigin } from "../lib/trusted-origins";

const router: IRouter = Router();
const REPORT_EXPIRY_DAYS = 90;

type AdvertiserReportPayload = {
  version: 1;
  campaign: {
    name: string;
    advertiserName: string;
    placement: string;
    startDate: string | null;
    endDate: string | null;
  };
  period: {
    from: string;
    to: string;
    days: number;
  };
  metrics: {
    impressions: number;
    clicks: number;
    measuredReach: number;
    uniqueClickers: number;
    clickThroughRate: number;
    currency: string;
    estimatedRevenueCents: number | null;
  };
  dailyPerformance: Array<{
    date: string;
    impressions: number;
    clicks: number;
  }>;
  placementPerformance: Array<{
    placement: string;
    pagePath: string;
    impressions: number;
    clicks: number;
    clickThroughRate: number;
  }>;
  generatedAt: string;
};

function clickThroughRate(impressions: number, clicks: number): number {
  return impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
}

function estimatedRevenueCents(
  billingModel: "flat" | "cpm" | "cpc",
  rateCents: number | null,
  impressions: number,
  clicks: number,
): number | null {
  if (rateCents === null) return null;
  if (billingModel === "cpm") return Math.round((impressions / 1000) * rateCents);
  if (billingModel === "cpc") return clicks * rateCents;
  return rateCents;
}

function reportPagePath(pagePath: string): string {
  const firstSegment = pagePath.split(/[?#]/, 1)[0]?.split("/").filter(Boolean)[0];
  return firstSegment ? `/${firstSegment}` : "/";
}

async function buildAdvertiserReport(adId: number, days: number): Promise<AdvertiserReportPayload | null> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const today = new Date().toISOString().slice(0, 10);

  const [campaign] = await db
    .select({
      name: adsTable.name,
      advertiserName: adsTable.advertiserName,
      placement: adsTable.placement,
      billingModel: adsTable.billingModel,
      currency: adsTable.currency,
      rateCents: adsTable.rateCents,
      startDate: adsTable.startDate,
      endDate: adsTable.endDate,
    })
    .from(adsTable)
    .where(eq(adsTable.id, adId))
    .limit(1);
  if (!campaign) return null;

  const eventWindow = and(
    eq(adAnalyticsEventsTable.adId, adId),
    gte(adAnalyticsEventsTable.createdAt, cutoff),
  );
  const [totals] = await db
    .select({
      impressions: sql<number>`COUNT(*) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'impression')::int`.as("impressions"),
      clicks: sql<number>`COUNT(*) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'click')::int`.as("clicks"),
      measuredReach: sql<number>`COUNT(DISTINCT ${adAnalyticsEventsTable.visitorToken})::int`.as("measured_reach"),
      uniqueClickers: sql<number>`COUNT(DISTINCT ${adAnalyticsEventsTable.visitorToken}) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'click')::int`.as("unique_clickers"),
    })
    .from(adAnalyticsEventsTable)
    .where(eventWindow);

  const dailyPerformance = await db
    .select({
      date: sql<string>`DATE(${adAnalyticsEventsTable.createdAt})`.as("date"),
      impressions: sql<number>`COUNT(*) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'impression')::int`.as("impressions"),
      clicks: sql<number>`COUNT(*) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'click')::int`.as("clicks"),
    })
    .from(adAnalyticsEventsTable)
    .where(eventWindow)
    .groupBy(sql`DATE(${adAnalyticsEventsTable.createdAt})`)
    .orderBy(sql`DATE(${adAnalyticsEventsTable.createdAt})`);

  const placementPerformance = await db
    .select({
      placement: adAnalyticsEventsTable.placement,
      pagePath: adAnalyticsEventsTable.pagePath,
      impressions: sql<number>`COUNT(*) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'impression')::int`.as("impressions"),
      clicks: sql<number>`COUNT(*) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'click')::int`.as("clicks"),
    })
    .from(adAnalyticsEventsTable)
    .where(eventWindow)
    .groupBy(adAnalyticsEventsTable.placement, adAnalyticsEventsTable.pagePath)
    .orderBy(sql`COUNT(*) DESC`);

  const impressions = Number(totals?.impressions ?? 0);
  const clicks = Number(totals?.clicks ?? 0);
  return {
    version: 1,
    campaign: {
      name: campaign.name,
      advertiserName: campaign.advertiserName,
      placement: campaign.placement,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
    },
    period: {
      from: cutoff.toISOString().slice(0, 10),
      to: today,
      days,
    },
    metrics: {
      impressions,
      clicks,
      measuredReach: Number(totals?.measuredReach ?? 0),
      uniqueClickers: Number(totals?.uniqueClickers ?? 0),
      clickThroughRate: clickThroughRate(impressions, clicks),
      currency: campaign.currency,
      estimatedRevenueCents: estimatedRevenueCents(campaign.billingModel, campaign.rateCents, impressions, clicks),
    },
    dailyPerformance: dailyPerformance.map((row) => ({
      date: String(row.date),
      impressions: Number(row.impressions),
      clicks: Number(row.clicks),
    })),
    placementPerformance: placementPerformance.map((row) => {
      const rowImpressions = Number(row.impressions);
      const rowClicks = Number(row.clicks);
      return {
        placement: row.placement,
        pagePath: reportPagePath(row.pagePath),
        impressions: rowImpressions,
        clicks: rowClicks,
        clickThroughRate: clickThroughRate(rowImpressions, rowClicks),
      };
    }),
    generatedAt: new Date().toISOString(),
  };
}

router.post("/analytics/reports", async (req, res): Promise<void> => {
  if (!hasTrustedMutationOrigin(req)) {
    res.status(403).json({ error: "This request must come from the trusted Mshauri application." });
    return;
  }

  const owner = await requireOwner(req, res);
  if (!owner) return;

  const body = req.body as { adId?: unknown; days?: unknown };
  const adId = typeof body.adId === "number" && Number.isInteger(body.adId) && body.adId > 0 ? body.adId : null;
  const days = typeof body.days === "number" && Number.isInteger(body.days)
    ? Math.min(Math.max(body.days, 1), 365)
    : null;
  if (adId === null || days === null) {
    res.status(400).json({ error: "Choose a campaign and reporting period." });
    return;
  }

  const payload = await buildAdvertiserReport(adId, days);
  if (!payload) {
    res.status(404).json({ error: "Campaign not found." });
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REPORT_EXPIRY_DAYS);
  await db.insert(advertiserReportsTable).values({
    tokenHash,
    adId,
    payload,
    createdBy: owner.id,
    expiresAt,
  });

  res.status(201).json({
    reportPath: `/reports/${token}`,
    expiresAt: expiresAt.toISOString(),
  });
});

router.get("/analytics/reports/:token", async (req, res): Promise<void> => {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  if (!token || !/^[a-zA-Z0-9_-]{40,}$/.test(token)) {
    res.status(404).json({ error: "Report unavailable." });
    return;
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [report] = await db
    .select({ payload: advertiserReportsTable.payload })
    .from(advertiserReportsTable)
    .where(and(
      eq(advertiserReportsTable.tokenHash, tokenHash),
      gt(advertiserReportsTable.expiresAt, new Date()),
      isNull(advertiserReportsTable.revokedAt),
    ))
    .limit(1);
  if (!report) {
    res.status(404).json({ error: "Report unavailable." });
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.json(report.payload);
});

router.get("/analytics/summary", async (req, res): Promise<void> => {
  const owner = await requireOwner(req, res);
  if (!owner) return;

  const daysRaw = req.query.days as string | undefined;
  const days = Math.min(Math.max(parseInt(daysRaw ?? "30", 10) || 30, 1), 365);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const [totalMessagesRow] = await db
    .select({ count: sql<number>`COUNT(*)::int`.as("count") })
    .from(analyticsEventsTable)
    .where(
      sql`${analyticsEventsTable.createdAt} >= ${cutoff} AND ${analyticsEventsTable.eventType} = 'message_received'`
    );

  const [totalFarmersRow] = await db
    .select({ count: sql<number>`COUNT(*)::int`.as("count") })
    .from(farmersTable)
    .where(eq(farmersTable.isActive, true));

  const langRows = await db
    .select({
      language: analyticsEventsTable.language,
      count: sql<number>`COUNT(*)::int`.as("count"),
    })
    .from(analyticsEventsTable)
    .where(
      sql`${analyticsEventsTable.createdAt} >= ${cutoff} AND ${analyticsEventsTable.language} IS NOT NULL`
    )
    .groupBy(analyticsEventsTable.language);

  const languageBreakdown: Record<string, number> = {};
  for (const row of langRows) {
    if (row.language) languageBreakdown[row.language] = Number(row.count);
  }

  const messagesPerDay = await db
    .select({
      date: sql<string>`DATE(${analyticsEventsTable.createdAt})`.as("date"),
      count: sql<number>`COUNT(*)::int`.as("count"),
    })
    .from(analyticsEventsTable)
    .where(
      sql`${analyticsEventsTable.createdAt} >= ${cutoff} AND ${analyticsEventsTable.eventType} = 'message_received'`
    )
    .groupBy(sql`DATE(${analyticsEventsTable.createdAt})`)
    .orderBy(sql`DATE(${analyticsEventsTable.createdAt})`);

  const eventTypeRows = await db
    .select({
      eventType: analyticsEventsTable.eventType,
      count: sql<number>`COUNT(*)::int`.as("count"),
    })
    .from(analyticsEventsTable)
    .where(gte(analyticsEventsTable.createdAt, cutoff))
    .groupBy(analyticsEventsTable.eventType)
    .orderBy(sql`COUNT(*) DESC`);

  const anonymousFeatureRows = await db
    .select({
      feature: anonymousUsageEventsTable.feature,
      count: sql<number>`COUNT(*)::int`.as("count"),
    })
    .from(anonymousUsageEventsTable)
    .where(gte(anonymousUsageEventsTable.createdAt, cutoff))
    .groupBy(anonymousUsageEventsTable.feature)
    .orderBy(sql`COUNT(*) DESC`);

  const [consentedUsageTotalRow] = await db
    .select({
      pageViews: sql<number>`COUNT(*) FILTER (WHERE ${anonymousUsageEventsTable.eventType} = 'page_view')::int`.as("page_views"),
      featureActions: sql<number>`COUNT(*) FILTER (WHERE ${anonymousUsageEventsTable.eventType} = 'feature_used')::int`.as("feature_actions"),
    })
    .from(anonymousUsageEventsTable)
    .where(gte(anonymousUsageEventsTable.createdAt, cutoff));

  const consentedUsagePerDay = await db
    .select({
      date: sql<string>`DATE(${anonymousUsageEventsTable.createdAt})`.as("date"),
      pageViews: sql<number>`COUNT(*) FILTER (WHERE ${anonymousUsageEventsTable.eventType} = 'page_view')::int`.as("page_views"),
      featureActions: sql<number>`COUNT(*) FILTER (WHERE ${anonymousUsageEventsTable.eventType} = 'feature_used')::int`.as("feature_actions"),
    })
    .from(anonymousUsageEventsTable)
    .where(gte(anonymousUsageEventsTable.createdAt, cutoff))
    .groupBy(sql`DATE(${anonymousUsageEventsTable.createdAt})`)
    .orderBy(sql`DATE(${anonymousUsageEventsTable.createdAt})`);

  const [adTotalsRow] = await db
    .select({
      impressions: sql<number>`COUNT(*) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'impression')::int`.as("impressions"),
      clicks: sql<number>`COUNT(*) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'click')::int`.as("clicks"),
      uniqueReach: sql<number>`COUNT(DISTINCT ${adAnalyticsEventsTable.visitorToken})::int`.as("unique_reach"),
      uniqueClickers: sql<number>`COUNT(DISTINCT ${adAnalyticsEventsTable.visitorToken}) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'click')::int`.as("unique_clickers"),
    })
    .from(adAnalyticsEventsTable)
    .where(gte(adAnalyticsEventsTable.createdAt, cutoff));

  const adCampaignRows = await db
    .select({
      adId: adsTable.id,
      campaign: adsTable.name,
      advertiserName: adsTable.advertiserName,
      status: adsTable.status,
      placement: adsTable.placement,
      billingModel: adsTable.billingModel,
      currency: adsTable.currency,
      rateCents: adsTable.rateCents,
      budgetCents: adsTable.budgetCents,
      impressions: sql<number>`COUNT(*) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'impression')::int`.as("impressions"),
      clicks: sql<number>`COUNT(*) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'click')::int`.as("clicks"),
      uniqueReach: sql<number>`COUNT(DISTINCT ${adAnalyticsEventsTable.visitorToken})::int`.as("unique_reach"),
      uniqueClickers: sql<number>`COUNT(DISTINCT ${adAnalyticsEventsTable.visitorToken}) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'click')::int`.as("unique_clickers"),
    })
    .from(adAnalyticsEventsTable)
    .innerJoin(adsTable, eq(adAnalyticsEventsTable.adId, adsTable.id))
    .where(gte(adAnalyticsEventsTable.createdAt, cutoff))
    .groupBy(
      adsTable.id,
      adsTable.name,
      adsTable.advertiserName,
      adsTable.status,
      adsTable.placement,
      adsTable.billingModel,
      adsTable.rateCents,
      adsTable.budgetCents,
    )
    .orderBy(sql`COUNT(*) DESC`);

  const adPerformancePerDay = await db
    .select({
      date: sql<string>`DATE(${adAnalyticsEventsTable.createdAt})`.as("date"),
      impressions: sql<number>`COUNT(*) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'impression')::int`.as("impressions"),
      clicks: sql<number>`COUNT(*) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'click')::int`.as("clicks"),
    })
    .from(adAnalyticsEventsTable)
    .where(gte(adAnalyticsEventsTable.createdAt, cutoff))
    .groupBy(sql`DATE(${adAnalyticsEventsTable.createdAt})`)
    .orderBy(sql`DATE(${adAnalyticsEventsTable.createdAt})`);

  const adPlacementRows = await db
    .select({
      placement: adAnalyticsEventsTable.placement,
      pagePath: adAnalyticsEventsTable.pagePath,
      impressions: sql<number>`COUNT(*) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'impression')::int`.as("impressions"),
      clicks: sql<number>`COUNT(*) FILTER (WHERE ${adAnalyticsEventsTable.eventType} = 'click')::int`.as("clicks"),
    })
    .from(adAnalyticsEventsTable)
    .where(gte(adAnalyticsEventsTable.createdAt, cutoff))
    .groupBy(adAnalyticsEventsTable.placement, adAnalyticsEventsTable.pagePath)
    .orderBy(sql`COUNT(*) DESC`);

  const adImpressions = Number(adTotalsRow?.impressions ?? 0);
  const adClicks = Number(adTotalsRow?.clicks ?? 0);

  res.json({
    totalMessages: Number(totalMessagesRow?.count ?? 0),
    totalFarmers: Number(totalFarmersRow?.count ?? 0),
    languageBreakdown,
    messagesPerDay: messagesPerDay.map((r) => ({
      date: String(r.date),
      count: Number(r.count),
    })),
    topEventTypes: eventTypeRows.map((r) => ({
      eventType: r.eventType,
      count: Number(r.count),
    })),
    anonymousFeatureUsage: anonymousFeatureRows.map((r) => ({
      feature: r.feature,
      count: Number(r.count),
    })),
    consentedUsage: {
      pageViews: Number(consentedUsageTotalRow?.pageViews ?? 0),
      featureActions: Number(consentedUsageTotalRow?.featureActions ?? 0),
    },
    consentedUsagePerDay: consentedUsagePerDay.map((r) => ({
      date: String(r.date),
      pageViews: Number(r.pageViews),
      featureActions: Number(r.featureActions),
    })),
    adTotals: {
      impressions: adImpressions,
      clicks: adClicks,
      uniqueReach: Number(adTotalsRow?.uniqueReach ?? 0),
      uniqueClickers: Number(adTotalsRow?.uniqueClickers ?? 0),
      clickThroughRate: clickThroughRate(adImpressions, adClicks),
    },
    adCampaigns: adCampaignRows.map((r) => {
      const impressions = Number(r.impressions);
      const clicks = Number(r.clicks);
      return {
        adId: r.adId,
        campaign: r.campaign,
        advertiserName: r.advertiserName,
        status: r.status,
        placement: r.placement,
        billingModel: r.billingModel,
        currency: r.currency,
        rateCents: r.rateCents,
        budgetCents: r.budgetCents,
        impressions,
        clicks,
        uniqueReach: Number(r.uniqueReach),
        uniqueClickers: Number(r.uniqueClickers),
        clickThroughRate: clickThroughRate(impressions, clicks),
        estimatedRevenueCents: estimatedRevenueCents(r.billingModel, r.rateCents, impressions, clicks),
      };
    }),
    adPerformancePerDay: adPerformancePerDay.map((r) => ({
      date: String(r.date),
      impressions: Number(r.impressions),
      clicks: Number(r.clicks),
    })),
    adPlacementPerformance: adPlacementRows.map((r) => ({
      placement: r.placement,
      pagePath: r.pagePath,
      impressions: Number(r.impressions),
      clicks: Number(r.clicks),
      clickThroughRate: clickThroughRate(Number(r.impressions), Number(r.clicks)),
    })),
  });
});

export { router as analyticsRouter };
