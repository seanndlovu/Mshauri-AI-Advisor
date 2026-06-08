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

export { router as marketPricesRouter };
