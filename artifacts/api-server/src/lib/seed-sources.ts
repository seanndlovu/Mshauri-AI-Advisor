import { eq } from "drizzle-orm";
import { db, knowledgeSourcesTable } from "@workspace/db";
import { logger } from "./logger";

const DEFAULT_SOURCES = [
  {
    name: "Maricho Media Downloads",
    url: "https://marichomedia.com/downloads/",
    type: "web_scrape" as const,
    category: "general",
    description: "Agricultural guides, publications and downloads from Maricho Media",
    refreshIntervalHours: 48,
  },
  {
    name: "FAO Zimbabwe Resources",
    url: "https://www.fao.org/zimbabwe/resources/en/",
    type: "web_scrape" as const,
    category: "crops",
    description: "Food and Agriculture Organization Zimbabwe publications and resources",
    refreshIntervalHours: 72,
  },
  {
    name: "Zimbabwe Herdbook",
    url: "https://zimherdbook.co.zw/",
    type: "web_scrape" as const,
    category: "livestock",
    description: "Livestock breed information — cattle, goat, sheep breed standards",
    refreshIntervalHours: 168,
  },
  {
    name: "LRF Breedplan Zimbabwe",
    url: "https://www.lrf.co.za/breedplan/database-search/zimbabwe/",
    type: "web_scrape" as const,
    category: "livestock",
    description: "Cattle breeding and genetics database for Zimbabwe",
    refreshIntervalHours: 168,
  },
  {
    name: "WOAH Animal Diseases",
    url: "https://www.woah.org/en/what-we-do/animal-health-and-welfare/animal-diseases/",
    type: "web_scrape" as const,
    category: "animal_health",
    description: "World Organisation for Animal Health — disease database and prevention guidelines",
    refreshIntervalHours: 72,
  },
  {
    name: "WOAH Main Resources",
    url: "https://www.woah.org/en/home/",
    type: "web_scrape" as const,
    category: "animal_health",
    description: "General WOAH resources and international animal health standards",
    refreshIntervalHours: 72,
  },
  {
    name: "Market Prices CSV",
    url: "https://prices.maricho.co.zw/latest.csv",
    type: "csv_import" as const,
    category: "market_prices",
    description: "Zimbabwe market prices — latest commodity prices",
    refreshIntervalHours: 6,
  },
  {
    name: "Maricho Articles Search",
    url: "https://maricho.co.zw/v1/search",
    type: "live_search" as const,
    category: "general",
    description: "Maricho Media articles database — live search at query time",
    refreshIntervalHours: 0,
  },
  {
    name: "Perplexity Research",
    url: "https://api.perplexity.ai",
    type: "perplexity" as const,
    category: "general",
    description: "Real-time agricultural research — weather, news, market trends",
    refreshIntervalHours: 0,
  },
  {
    name: "EDEN Agriculture Videos",
    url: "https://www.youtube.com/@EDENvideos",
    type: "youtube_rss" as const,
    category: "livestock",
    description: "Educational farming demonstrations and livestock management tutorials",
    refreshIntervalHours: 48,
  },
];

export async function seedKnowledgeSources(): Promise<void> {
  try {
    const existing = await db.select({ url: knowledgeSourcesTable.url }).from(knowledgeSourcesTable);
    const existingUrls = new Set(existing.map((r) => r.url));

    const toInsert = DEFAULT_SOURCES.filter((s) => !existingUrls.has(s.url));
    if (toInsert.length === 0) return;

    await db.insert(knowledgeSourcesTable).values(toInsert);
    logger.info({ count: toInsert.length }, "Knowledge sources seeded");
  } catch (err) {
    logger.error({ err }, "Failed to seed knowledge sources");
  }
}
