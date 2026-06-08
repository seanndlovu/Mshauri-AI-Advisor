import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marketPricesTable = pgTable("market_prices", {
  id: serial("id").primaryKey(),
  commodity: text("commodity").notNull(),
  unit: text("unit").notNull().default("kg"),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
  market: text("market").notNull().default("GMB"),
  priceDate: text("price_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMarketPriceSchema = createInsertSchema(marketPricesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMarketPrice = z.infer<typeof insertMarketPriceSchema>;
export type MarketPrice = typeof marketPricesTable.$inferSelect;
