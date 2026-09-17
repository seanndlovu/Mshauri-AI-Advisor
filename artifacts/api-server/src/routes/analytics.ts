import { Router, type IRouter } from "express";
import { eq, gte, sql } from "drizzle-orm";
import {
  adAnalyticsEventsTable,
  adsTable,
  anonymousUsageEventsTable,
  analyticsEventsTable,
  db,
  farmersTable,
} from "@workspace/db";
import { requireOwner } from "../lib/admin-access";

const router: IRouter = Router();

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
