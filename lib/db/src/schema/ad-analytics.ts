import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { adsTable } from "./ads";

export const adAnalyticsEventsTable = pgTable(
  "ad_analytics_events",
  {
    id: serial("id").primaryKey(),
    adId: integer("ad_id")
      .notNull()
      .references(() => adsTable.id, { onDelete: "cascade" }),
    eventType: text("event_type", { enum: ["impression", "click"] }).notNull(),
    placement: text("placement").notNull(),
    pagePath: text("page_path").notNull(),
    visitorToken: text("visitor_token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ad_analytics_events_ad_created_at_idx").on(table.adId, table.createdAt),
    index("ad_analytics_events_event_created_at_idx").on(table.eventType, table.createdAt),
    index("ad_analytics_events_visitor_token_idx").on(table.visitorToken),
  ],
);

export type AdAnalyticsEvent = typeof adAnalyticsEventsTable.$inferSelect;