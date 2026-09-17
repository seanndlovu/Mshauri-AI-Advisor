import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const advertiserReportsTable = pgTable(
  "advertiser_reports",
  {
    id: serial("id").primaryKey(),
    tokenHash: text("token_hash").notNull(),
    adId: integer("ad_id").notNull(),
    payload: jsonb("payload").notNull(),
    createdBy: integer("created_by").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("advertiser_reports_token_hash_idx").on(table.tokenHash),
    index("advertiser_reports_expires_at_idx").on(table.expiresAt),
  ],
);

export type AdvertiserReport = typeof advertiserReportsTable.$inferSelect;