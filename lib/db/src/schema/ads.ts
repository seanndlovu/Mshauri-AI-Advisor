import { pgTable, serial, text, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adsTable = pgTable("ads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  advertiserName: text("advertiser_name").notNull(),
  targetUrl: text("target_url").notNull(),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text").notNull(),
  placement: text("placement", { enum: ["sidebar_square"] }).notNull().default("sidebar_square"),
  status: text("status", { enum: ["draft", "active", "paused", "expired"] }).notNull().default("draft"),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAdSchema = createInsertSchema(adsTable).omit({ id: true, createdAt: true, updatedAt: true, createdBy: true });
export type InsertAd = z.infer<typeof insertAdSchema>;
export type Ad = typeof adsTable.$inferSelect;