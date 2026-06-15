import { Router, type IRouter } from "express";
import { eq, ilike, desc } from "drizzle-orm";
import { db, marketPricesTable } from "@workspace/db";

const router: IRouter = Router();

function formatPrice(p: typeof marketPricesTable.$inferSelect) {
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/market-prices", async (req, res): Promise<void> => {
  const commodity = req.query.commodity as string | undefined;
  const market = req.query.market as string | undefined;

  let prices;
  if (commodity) {
    prices = await db
      .select()
      .from(marketPricesTable)
      .where(ilike(marketPricesTable.commodity, `%${commodity}%`))
      .orderBy(desc(marketPricesTable.priceDate));
  } else if (market) {
    prices = await db
      .select()
      .from(marketPricesTable)
      .where(ilike(marketPricesTable.market, `%${market}%`))
      .orderBy(desc(marketPricesTable.priceDate));
  } else {
    prices = await db.select().from(marketPricesTable).orderBy(desc(marketPricesTable.priceDate));
  }

  res.json(prices.map(formatPrice));
});

router.post("/market-prices", async (req, res): Promise<void> => {
  const body = req.body as {
    commodity: string;
    unit?: string;
    priceUsd: string;
    market?: string;
    priceDate: string;
    notes?: string;
  };

  const [created] = await db
    .insert(marketPricesTable)
    .values({
      commodity: body.commodity,
      unit: body.unit ?? "kg",
      priceUsd: body.priceUsd,
      market: body.market ?? "GMB",
      priceDate: body.priceDate,
      notes: body.notes ?? null,
    })
    .returning();

  res.status(201).json(formatPrice(created));
});

router.patch("/market-prices/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const body = req.body as {
    commodity?: string;
    unit?: string;
    priceUsd?: string;
    market?: string;
    priceDate?: string;
    notes?: string;
  };

  const [updated] = await db
    .update(marketPricesTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(marketPricesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Price entry not found" });
    return;
  }
  res.json(formatPrice(updated));
});

router.delete("/market-prices/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(marketPricesTable).where(eq(marketPricesTable.id, id));
  res.sendStatus(204);
});

/* ─── Live Prices Scraper (ZimPriceCheck) ─────────────────── */
interface LivePrice {
  item: string;
  quantity: string;
  priceUsd: number;
  priceZig: number;
  category: string;
  source: "zimpricecheck";
}

let liveCache: { data: LivePrice[]; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function classifyCategory(item: string): string {
  const l = item.toLowerCase();
  if (/maize|wheat|sorghum|millet|rice|groundnut|soya|sugar bean|cow pea|popcorn|mapfunde|mhunga|mumhare|nyemba|nzungu/.test(l))
    return "Grains & Staples";
  if (/broiler|roadrunner|guinea|layer|kapenta|matemba|mopane|caterpillar|eggs|egg|matemba/.test(l))
    return "Protein";
  if (/dried|cooked|dehulled/.test(l))
    return "Dried & Processed";
  if (/apple|avocado|banana|lemon|orange|pineapple|pawpaw|strawberry|watermelon|masawu|matohwe|mauyu|sugarcane/.test(l))
    return "Fruits";
  return "Vegetables";
}

router.get("/market-prices/live", async (req, res): Promise<void> => {
  const force = req.query.force === "1";
  if (!force && liveCache && (Date.now() - liveCache.fetchedAt) < CACHE_TTL) {
    res.json({ data: liveCache.data, fetchedAt: new Date(liveCache.fetchedAt).toISOString(), cached: true });
    return;
  }

  try {
    const r = await fetch(
      "https://docs.google.com/spreadsheets/d/1Xhm6GEsJTncv_aPhK9Ivo1eq40ZQTxeE3PphNy8uQ_s/gviz/tq?tqx=out:csv",
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Mshauri/1.0)" },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const csv = await r.text();

    const prices: LivePrice[] = [];
    const lines = csv.split("\n").slice(1); // skip header row

    for (const line of lines) {
      if (!line.trim()) continue;
      // Parse quoted CSV fields
      const cols = (line.match(/"([^"]*)"/g) ?? []).map(c => c.replace(/^"|"$/g, "").trim());
      if (cols.length < 3) continue;
      const [item, quantity, usdStr, zigStr = ""] = cols;
      if (!item) continue;
      const usdMatch = usdStr.replace(/,/g, "").match(/[\d.]+/);
      if (!usdMatch) continue;
      const priceUsd = parseFloat(usdMatch[0]);
      if (priceUsd === 0) continue;
      const zigMatch = zigStr.replace(/,/g, "").replace(/\s+/g, "").match(/[\d.]+/);
      prices.push({
        item,
        quantity,
        priceUsd,
        priceZig: zigMatch ? parseFloat(zigMatch[0]) : 0,
        category: classifyCategory(item),
        source: "zimpricecheck",
      });
    }

    if (prices.length === 0) throw new Error("No prices parsed");

    liveCache = { data: prices, fetchedAt: Date.now() };
    res.json({ data: prices, fetchedAt: new Date().toISOString(), cached: false });
  } catch (err) {
    req.log.error({ err }, "Live prices fetch failed");
    if (liveCache) {
      res.json({ data: liveCache.data, fetchedAt: new Date(liveCache.fetchedAt).toISOString(), cached: true, stale: true });
    } else {
      res.status(502).json({ error: "Could not fetch live prices" });
    }
  }
});

export { router as marketPricesRouter };
