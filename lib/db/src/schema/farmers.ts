import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const farmersTable = pgTable("farmers", {
  phone: text("phone").primaryKey(),
  name: text("name"),
  location: text("location"),
  crops: text("crops").array().notNull().default([]),
  livestock: text("livestock").array().notNull().default([]),
  languagePref: text("language_pref", { enum: ["en", "sn", "nd"] }).notNull().default("en"),
  isActive: boolean("is_active").notNull().default(true),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFarmerSchema = createInsertSchema(farmersTable).omit({ createdAt: true, updatedAt: true });
export type InsertFarmer = z.infer<typeof insertFarmerSchema>;
export type Farmer = typeof farmersTable.$inferSelect;
