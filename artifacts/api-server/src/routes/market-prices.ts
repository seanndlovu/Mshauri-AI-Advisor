import { Router, type IRouter } from "express";
import { and, desc, eq, ilike } from "drizzle-orm";
import {
  db,
  marketPriceBatchesTable,
  marketPriceBatchEntriesTable,
  type MarketPriceBatch,
  type MarketPriceBatchEntry,
} from "@workspace/db";
import { requirePriceAdmin } from "../lib/admin-access";
import { parseMarketPriceWorkbook, type ImportedPriceEntry } from "../lib/market-price-import";
import { hasTrustedMutationOrigin } from "../lib/trusted-origins";

export type MarketPricesDatabase = Pick<typeof db, "select" | "insert" | "update" | "delete" | "transaction">;
export type MarketPricesRouterOptions = {
  database?: MarketPricesDatabase;
  requirePriceAdmin?: typeof requirePriceAdmin;
};

export function createMarketPricesRouter(options: MarketPricesRouterOptions = {}): IRouter {
  const database = options.database ?? db;
  const authorizePriceAdmin = options.requirePriceAdmin ?? requirePriceAdmin;
  const router: IRouter = Router();

router.use("/admin/market-price-batches", (req, res, next) => {
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

type PriceEntryInput = Partial<ImportedPriceEntry>;

function classifyCategory(item: string): string {
  const name = item.toLowerCase();
  if (/maize|wheat|sorghum|millet|rice|groundnut|soya|bean|cow pea/.test(name)) return "Grains & Staples";
  if (/broiler|roadrunner|guinea|layer|kapenta|matemba|egg/.test(name)) return "Protein";
  if (/dried|cooked|dehulled/.test(name)) return "Dried & Processed";
  if (/apple|avocado|banana|lemon|orange|pineapple|pawpaw|strawberry|watermelon/.test(name)) return "Fruits";
  return "Vegetables";
}

function formatBatch(batch: MarketPriceBatch, entryCount: number) {
  return {
    ...batch,
    entryCount,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
    publishedAt: batch.publishedAt?.toISOString() ?? null,
  };
}

function formatEntry(entry: MarketPriceBatchEntry) {
  return {
    ...entry,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function formatPublicEntry(entry: MarketPriceBatchEntry) {
  return {
    ...formatEntry(entry),
    item: entry.commodity,
    quantity: [entry.grade, entry.unit].filter(Boolean).join(" · "),
    category: classifyCategory(entry.commodity),
  };
}

function getId(value: string | string[] | undefined): number | null {
  const id = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function asMoney(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(String(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(amount) && amount >= 0 ? amount.toFixed(2) : null;
}

function validateEntry(input: PriceEntryInput, batch: MarketPriceBatch): { entry?: ImportedPriceEntry; error?: string } {
  const commodity = input.commodity?.trim() ?? "";
  const market = input.market?.trim() ?? "";
  const unit = input.unit?.trim() ?? "";
  const observedDate = input.observedDate?.trim() || batch.observedDate;
  const priceUsd = asMoney(input.priceUsd);
  const priceZig = asMoney(input.priceZig);
  if (!commodity || !market || !unit) return { error: "Commodity, market, and unit are required." };
  if (!priceUsd && !priceZig) return { error: "Enter a valid USD or ZiG price." };
  if (!isDate(observedDate)) return { error: "Observed date must use YYYY-MM-DD." };

  return {
    entry: {
      commodity,
      grade: input.grade?.trim() || null,
      market,
      unit,
      priceUsd,
      priceZig,
      observedDate,
      source: input.source?.trim() || batch.source,
      notes: input.notes?.trim() || null,
    },
  };
}

async function getBatchWithEntries(batchId: number) {
  const [batch] = await database.select().from(marketPriceBatchesTable).where(eq(marketPriceBatchesTable.id, batchId)).limit(1);
  if (!batch) return null;
  const entries = await database
    .select()
    .from(marketPriceBatchEntriesTable)
    .where(eq(marketPriceBatchEntriesTable.batchId, batchId))
    .orderBy(marketPriceBatchEntriesTable.market, marketPriceBatchEntriesTable.commodity);
  return { batch, entries };
}

router.get("/market-prices", async (req, res): Promise<void> => {
  const [edition] = await database
    .select()
    .from(marketPriceBatchesTable)
    .where(eq(marketPriceBatchesTable.status, "published"))
    .orderBy(desc(marketPriceBatchesTable.publishedAt))
    .limit(1);

  if (!edition) {
    res.json({ data: [], edition: null });
    return;
  }

  const commodity = typeof req.query.commodity === "string" ? req.query.commodity : "";
  const market = typeof req.query.market === "string" ? req.query.market : "";
  const filters = [eq(marketPriceBatchEntriesTable.batchId, edition.id)];
  if (commodity) filters.push(ilike(marketPriceBatchEntriesTable.commodity, `%${commodity}%`));
  if (market) filters.push(ilike(marketPriceBatchEntriesTable.market, `%${market}%`));
  const entries = await database
    .select()
    .from(marketPriceBatchEntriesTable)
    .where(and(...filters))
    .orderBy(marketPriceBatchEntriesTable.market, marketPriceBatchEntriesTable.commodity);

  res.json({
    data: entries.map(formatPublicEntry),
    edition: formatBatch(edition, entries.length),
  });
});

router.get("/admin/market-price-template", async (req, res): Promise<void> => {
  const user = await authorizePriceAdmin(req, res);
  if (!user) return;
  const sample = [
    "Commodity,Grade,Unit,Market,Price USD,Price ZiG,Observed Date,Source,Notes",
    "Maize,Grade A,50 kg bag,GMB,12.50,0,2026-08-21,Mshauri price desk,Sample row - replace before upload",
  ].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="mshauri-market-price-template.csv"');
  res.send(sample);
});

router.get("/admin/market-price-batches", async (req, res): Promise<void> => {
  const user = await authorizePriceAdmin(req, res);
  if (!user) return;
  const [batches, entries] = await Promise.all([
    database.select().from(marketPriceBatchesTable).orderBy(desc(marketPriceBatchesTable.createdAt)),
    database.select({ batchId: marketPriceBatchEntriesTable.batchId }).from(marketPriceBatchEntriesTable),
  ]);
  const counts = new Map<number, number>();
  entries.forEach((entry) => counts.set(entry.batchId, (counts.get(entry.batchId) ?? 0) + 1));
  res.json({ batches: batches.map((batch) => formatBatch(batch, counts.get(batch.id) ?? 0)) });
});

router.get("/admin/market-price-batches/:id", async (req, res): Promise<void> => {
  const user = await authorizePriceAdmin(req, res);
  if (!user) return;
  const batchId = getId(req.params.id);
  if (!batchId) {
    res.status(400).json({ error: "Invalid price batch." });
    return;
  }
  const result = await getBatchWithEntries(batchId);
  if (!result) {
    res.status(404).json({ error: "Price batch not found." });
    return;
  }
  res.json({
    batch: formatBatch(result.batch, result.entries.length),
    entries: result.entries.map(formatEntry),
  });
});

router.post("/admin/market-price-batches", async (req, res): Promise<void> => {
  const user = await authorizePriceAdmin(req, res);
  if (!user) return;
  const body = req.body as { name?: string; source?: string; observedDate?: string; fileName?: string; fileData?: string };
  const name = body.name?.trim() ?? "";
  const source = body.source?.trim() || "Mshauri price desk";
  const observedDate = body.observedDate?.trim() ?? "";
  if (!name || !isDate(observedDate)) {
    res.status(400).json({ error: "Provide an edition name and a valid observed date." });
    return;
  }

  let entries: ImportedPriceEntry[] = [];
  if (body.fileData || body.fileName) {
    if (!body.fileData || !body.fileName || !/\.(csv|xlsx)$/i.test(body.fileName)) {
      res.status(400).json({ error: "Upload a .csv or .xlsx price sheet." });
      return;
    }
    try {
      const parsed = parseMarketPriceWorkbook(body.fileName, body.fileData, observedDate, source);
      if (parsed.errors.length) {
        res.status(422).json({ errors: parsed.errors, imported: 0 });
        return;
      }
      entries = parsed.entries;
    } catch (error) {
      req.log.warn({ error }, "Market price import rejected");
      res.status(400).json({ error: error instanceof Error ? error.message : "The price sheet could not be read." });
      return;
    }
  }

  const result = await database.transaction(async (tx) => {
    const [batch] = await tx
      .insert(marketPriceBatchesTable)
      .values({ name, source, observedDate, createdBy: user.id })
      .returning();
    if (entries.length) {
      await tx.insert(marketPriceBatchEntriesTable).values(entries.map((entry) => ({ ...entry, batchId: batch!.id })));
    }
    return batch!;
  });

  res.status(201).json({ batch: formatBatch(result, entries.length), errors: [], imported: entries.length });
});

router.post("/admin/market-price-batches/:id/entries", async (req, res): Promise<void> => {
  const user = await authorizePriceAdmin(req, res);
  if (!user) return;
  const batchId = getId(req.params.id);
  if (!batchId) {
    res.status(400).json({ error: "Invalid price batch." });
    return;
  }
  const result = await getBatchWithEntries(batchId);
  if (!result) {
    res.status(404).json({ error: "Price batch not found." });
    return;
  }
  if (result.batch.status !== "draft") {
    res.status(409).json({ error: "Create or duplicate a draft before editing prices." });
    return;
  }
  const validated = validateEntry(req.body as PriceEntryInput, result.batch);
  if (!validated.entry) {
    res.status(400).json({ error: validated.error });
    return;
  }
  const [entry] = await database.insert(marketPriceBatchEntriesTable).values({ ...validated.entry, batchId }).returning();
  res.status(201).json({ entry: formatEntry(entry!) });
});

router.patch("/admin/market-price-batches/:id/entries/:entryId", async (req, res): Promise<void> => {
  const user = await authorizePriceAdmin(req, res);
  if (!user) return;
  const batchId = getId(req.params.id);
  const entryId = getId(req.params.entryId);
  if (!batchId || !entryId) {
    res.status(400).json({ error: "Invalid price batch or entry." });
    return;
  }
  const result = await getBatchWithEntries(batchId);
  const existing = result?.entries.find((entry) => entry.id === entryId);
  if (!result || !existing) {
    res.status(404).json({ error: "Price entry not found." });
    return;
  }
  if (result.batch.status !== "draft") {
    res.status(409).json({ error: "Create or duplicate a draft before editing prices." });
    return;
  }
  const validated = validateEntry({ ...existing, ...(req.body as PriceEntryInput) }, result.batch);
  if (!validated.entry) {
    res.status(400).json({ error: validated.error });
    return;
  }
  const [entry] = await database
    .update(marketPriceBatchEntriesTable)
    .set({ ...validated.entry, updatedAt: new Date() })
    .where(and(eq(marketPriceBatchEntriesTable.id, entryId), eq(marketPriceBatchEntriesTable.batchId, batchId)))
    .returning();
  res.json({ entry: formatEntry(entry!) });
});

router.delete("/admin/market-price-batches/:id/entries/:entryId", async (req, res): Promise<void> => {
  const user = await authorizePriceAdmin(req, res);
  if (!user) return;
  const batchId = getId(req.params.id);
  const entryId = getId(req.params.entryId);
  if (!batchId || !entryId) {
    res.status(400).json({ error: "Invalid price batch or entry." });
    return;
  }
  const [batch] = await database.select().from(marketPriceBatchesTable).where(eq(marketPriceBatchesTable.id, batchId)).limit(1);
  if (!batch || batch.status !== "draft") {
    res.status(409).json({ error: "Only draft price editions can be changed." });
    return;
  }
  await database.delete(marketPriceBatchEntriesTable).where(and(eq(marketPriceBatchEntriesTable.id, entryId), eq(marketPriceBatchEntriesTable.batchId, batchId)));
  res.sendStatus(204);
});

router.post("/admin/market-price-batches/:id/publish", async (req, res): Promise<void> => {
  const user = await authorizePriceAdmin(req, res);
  if (!user) return;
  const batchId = getId(req.params.id);
  if (!batchId) {
    res.status(400).json({ error: "Invalid price batch." });
    return;
  }
  const result = await getBatchWithEntries(batchId);
  if (!result) {
    res.status(404).json({ error: "Price batch not found." });
    return;
  }
  if (result.entries.length === 0) {
    res.status(400).json({ error: "Add at least one price before publishing." });
    return;
  }
  if (result.batch.status !== "draft" && result.batch.status !== "archived") {
    res.status(409).json({ error: "This edition is already published." });
    return;
  }

  try {
    const published = await database.transaction(async (tx) => {
      await tx
        .update(marketPriceBatchesTable)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(marketPriceBatchesTable.status, "published"));
      const [batch] = await tx
        .update(marketPriceBatchesTable)
        .set({ status: "published", publishedBy: user.id, publishedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(marketPriceBatchesTable.id, batchId), eq(marketPriceBatchesTable.status, result.batch.status)))
        .returning();
      if (!batch) throw new Error("This edition changed while it was being published. Please refresh and try again.");
      return batch;
    });
    res.json({ batch: formatBatch(published, result.entries.length) });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      res.status(409).json({ error: "Another price edition was published at the same time. Please refresh and try again." });
      return;
    }
    throw error;
  }
});

router.post("/admin/market-price-batches/:id/duplicate", async (req, res): Promise<void> => {
  const user = await authorizePriceAdmin(req, res);
  if (!user) return;
  const batchId = getId(req.params.id);
  if (!batchId) {
    res.status(400).json({ error: "Invalid price batch." });
    return;
  }
  const result = await getBatchWithEntries(batchId);
  if (!result) {
    res.status(404).json({ error: "Price batch not found." });
    return;
  }
  const copied = await database.transaction(async (tx) => {
    const [batch] = await tx
      .insert(marketPriceBatchesTable)
      .values({
        name: `${result.batch.name} copy`,
        source: result.batch.source,
        observedDate: result.batch.observedDate,
        createdBy: user.id,
      })
      .returning();
    if (result.entries.length) {
      await tx.insert(marketPriceBatchEntriesTable).values(result.entries.map(({ id, batchId: _, createdAt, updatedAt, ...entry }) => ({
        ...entry,
        batchId: batch!.id,
      })));
    }
    return batch!;
  });
  res.status(201).json({ batch: formatBatch(copied, result.entries.length) });
});

  return router;
}

const router = createMarketPricesRouter();
export { router as marketPricesRouter };