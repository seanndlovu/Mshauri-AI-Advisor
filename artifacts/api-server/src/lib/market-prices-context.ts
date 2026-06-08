import { desc } from "drizzle-orm";
import { db, marketPricesTable } from "@workspace/db";

/**
 * Returns the most recent market price entries formatted for injection
 * into the AI system prompt.
 */
export async function getMarketPricesContext(): Promise<string> {
  const prices = await db
    .select()
    .from(marketPricesTable)
    .orderBy(desc(marketPricesTable.priceDate))
    .limit(12);

  if (prices.length === 0) return "";

  const formatted = prices
    .map((p) => `• ${p.commodity} — $${p.priceUsd}/${p.unit} (${p.market}, ${p.priceDate})`)
    .join("\n");

  return `\n\n--- CURRENT ZIMBABWE MARKET PRICES ---\n${formatted}\nNote: Use these prices when giving marketing or selling advice.\n--- END MARKET PRICES ---`;
}
