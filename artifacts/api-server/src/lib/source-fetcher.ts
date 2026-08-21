import { eq, and } from "drizzle-orm";
import { db, articlesTable, knowledgeSourcesTable } from "@workspace/db";
import { logger } from "./logger";

const FETCH_TIMEOUT_MS = 15_000;

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkText(text: string, chunkSize = 1200): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim().length > 100) chunks.push(current.trim());
  return chunks;
}

async function fetchWithTimeout(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MshauriAI/1.0 (agricultural assistant; +https://mshauriai.replit.app)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeWebSource(sourceId: number, name: string, url: string, category: string): Promise<string> {
  const html = await fetchWithTimeout(url);
  const text = extractTextFromHtml(html);
  if (text.length < 100) throw new Error("Page returned too little content");

  const chunks = chunkText(text);

  await db.delete(articlesTable).where(
    and(eq(articlesTable.sourceId, sourceId), eq(articlesTable.isActive, true))
  );

  for (let i = 0; i < Math.min(chunks.length, 20); i++) {
    await db.insert(articlesTable).values({
      title: `${name} — Part ${i + 1}`,
      content: chunks[i],
      category,
      tags: [name.toLowerCase().replace(/\s+/g, "-")],
      language: "en",
      isActive: true,
      sourceId,
    });
  }

  return `scraped ${Math.min(chunks.length, 20)} chunks`;
}

async function scrapeYoutubeChannel(sourceId: number, name: string, channelUrl: string): Promise<string> {
  const html = await fetchWithTimeout(channelUrl);

  const titleMatches = [...html.matchAll(/"title":\{"runs":\[\{"text":"([^"]{10,100})"\}/g)];
  const descMatches = [...html.matchAll(/"descriptionSnippet":\{"runs":\[\{"text":"([^"]{20,500})"\}/g)];

  await db.delete(articlesTable).where(eq(articlesTable.sourceId, sourceId));

  const seen = new Set<string>();
  let count = 0;
  for (let i = 0; i < Math.min(titleMatches.length, 15); i++) {
    const title = titleMatches[i][1];
    if (seen.has(title)) continue;
    seen.add(title);
    const desc = descMatches[i]?.[1] ?? "Agricultural farming tutorial video.";
    await db.insert(articlesTable).values({
      title: `${name}: ${title}`,
      content: `Video: ${title}\n\n${desc}`,
      category: "livestock",
      tags: ["video", "eden", "farming"],
      language: "en",
      isActive: true,
      sourceId,
    });
    count++;
  }

  if (count === 0) {
    await db.insert(articlesTable).values({
      title: `${name} — Educational Farming Videos`,
      content: `EDEN Agriculture provides educational farming demonstration videos on livestock management, crop production, and sustainable farming practices for Zimbabwe and Southern Africa. Visit ${channelUrl} for tutorials.`,
      category: "livestock",
      tags: ["video", "eden", "farming"],
      language: "en",
      isActive: true,
      sourceId,
    });
    count = 1;
  }

  return `saved ${count} video entries`;
}

export async function fetchSource(sourceId: number): Promise<void> {
  const [source] = await db
    .select()
    .from(knowledgeSourcesTable)
    .where(eq(knowledgeSourcesTable.id, sourceId))
    .limit(1);

  if (!source) throw new Error(`Source ${sourceId} not found`);

  logger.info({ sourceId, name: source.name, type: source.type }, "Fetching knowledge source");

  let status = "ok";
  try {
    let detail: string;
    switch (source.type) {
      case "web_scrape":
        detail = await scrapeWebSource(source.id, source.name, source.url, source.category);
        break;
      case "csv_import":
        detail = "disabled — verified market prices are published through the Market Price Desk";
        break;
      case "youtube_rss":
        detail = await scrapeYoutubeChannel(source.id, source.name, source.url);
        break;
      case "live_search":
      case "perplexity":
        detail = "live — fetched at query time";
        break;
      default:
        detail = "unknown type";
    }
    status = `ok: ${detail}`;
    logger.info({ sourceId, name: source.name, detail }, "Source fetch complete");
  } catch (err) {
    status = `error: ${err instanceof Error ? err.message : String(err)}`;
    logger.error({ sourceId, name: source.name, err }, "Source fetch failed");
  }

  await db
    .update(knowledgeSourcesTable)
    .set({ lastFetched: new Date(), lastStatus: status })
    .where(eq(knowledgeSourcesTable.id, source.id));
}

export async function fetchAllActiveSources(): Promise<void> {
  const sources = await db
    .select()
    .from(knowledgeSourcesTable)
    .where(eq(knowledgeSourcesTable.isActive, true));

  for (const source of sources) {
    if (source.type === "live_search" || source.type === "perplexity" || source.category === "market_prices") continue;

    const needsRefresh =
      !source.lastFetched ||
      Date.now() - source.lastFetched.getTime() > source.refreshIntervalHours * 60 * 60 * 1000;

    if (needsRefresh) {
      await fetchSource(source.id).catch((err) =>
        logger.error({ sourceId: source.id, err }, "Background fetch failed")
      );
    }
  }
}
