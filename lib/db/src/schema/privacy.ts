import { boolean, index, integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

import { usersTable } from "./users";

export const privacyPreferencesTable = pgTable(
  "privacy_preferences",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    analyticsConsent: boolean("analytics_consent").notNull().default(false),
    marketingConsent: boolean("marketing_consent").notNull().default(false),
    consentVersion: text("consent_version").notNull().default("2026-09-17"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    unique("privacy_preferences_user_id_unique").on(table.userId),
    index("privacy_preferences_updated_at_idx").on(table.updatedAt),
  ],
);

export const anonymousUsageEventsTable = pgTable(
  "anonymous_usage_events",
  {
    id: serial("id").primaryKey(),
    eventType: text("event_type", { enum: ["page_view", "feature_used"] }).notNull(),
    feature: text("feature").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("anonymous_usage_events_feature_idx").on(table.feature),
    index("anonymous_usage_events_created_at_idx").on(table.createdAt),
  ],
);

export type PrivacyPreferences = typeof privacyPreferencesTable.$inferSelect;
export type AnonymousUsageEvent = typeof anonymousUsageEventsTable.$inferSelect;