import { Router, type IRouter } from "express";
import { eq, gte, sql } from "drizzle-orm";
import { db, analyticsEventsTable, farmersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/analytics/summary", async (req, res): Promise<void> => {
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
  });
});

export { router as analyticsRouter };
