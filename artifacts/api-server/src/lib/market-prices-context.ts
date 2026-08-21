import { desc, eq } from "drizzle-orm";
import { db, marketPriceBatchesTable, marketPriceBatchEntriesTable } from "@workspace/db";

/**
 * Returns the most recent market price entries formatted for injection
 * into the AI system prompt.
 */
export async function getMarketPricesContext(): Promise<string> {
  const [edition] = await db
    .select()
    .from(marketPriceBatchesTable)
    .where(eq(marketPriceBatchesTable.status, "published"))
    .orderBy(desc(marketPriceBatchesTable.publishedAt))
    .limit(1);
  if (!edition) return "";

  const prices = await db
    .select()
    .from(marketPriceBatchEntriesTable)
    .where(eq(marketPriceBatchEntriesTable.batchId, edition.id))
    .orderBy(marketPriceBatchEntriesTable.market, marketPriceBatchEntriesTable.commodity)
    .limit(12);

  if (prices.length === 0) return "";

  const formatted = prices
    .map((p) => {
      const prices = [
        p.priceUsd ? `US$${p.priceUsd}` : null,
        p.priceZig ? `${p.priceZig} ZiG` : null,
      ].filter(Boolean).join(" / ");
      return `• ${p.commodity}${p.grade ? ` (${p.grade})` : ""} — ${prices}/${p.unit} (${p.market}, ${p.observedDate})`;
    })
    .join("\n");

  return `\n\n--- CURRENT ZIMBABWE MARKET PRICES ---\n${formatted}\nNote: Use these prices when giving marketing or selling advice.\n--- END MARKET PRICES ---`;
}
