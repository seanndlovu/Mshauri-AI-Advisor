import { pgTable, serial, text, numeric, timestamp, integer, date, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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

export const marketPriceBatchesTable = pgTable("market_price_batches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source").notNull().default("Mshauri price desk"),
  observedDate: date("observed_date", { mode: "string" }).notNull(),
  status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
  createdBy: integer("created_by"),
  publishedBy: integer("published_by"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("market_price_batches_one_published").on(table.status).where(sql`${table.status} = 'published'`),
]);

export const marketPriceBatchEntriesTable = pgTable("market_price_batch_entries", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => marketPriceBatchesTable.id, { onDelete: "cascade" }),
  commodity: text("commodity").notNull(),
  grade: text("grade"),
  unit: text("unit").notNull(),
  market: text("market").notNull(),
  priceUsd: numeric("price_usd", { precision: 12, scale: 2 }),
  priceZig: numeric("price_zig", { precision: 14, scale: 2 }),
  observedDate: date("observed_date", { mode: "string" }).notNull(),
  source: text("source").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMarketPriceSchema = createInsertSchema(marketPricesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMarketPrice = z.infer<typeof insertMarketPriceSchema>;
export type MarketPrice = typeof marketPricesTable.$inferSelect;
export const insertMarketPriceBatchSchema = createInsertSchema(marketPriceBatchesTable).omit({ id: true, createdAt: true, updatedAt: true, publishedAt: true });
export const insertMarketPriceBatchEntrySchema = createInsertSchema(marketPriceBatchEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type MarketPriceBatch = typeof marketPriceBatchesTable.$inferSelect;
export type MarketPriceBatchEntry = typeof marketPriceBatchEntriesTable.$inferSelect;
