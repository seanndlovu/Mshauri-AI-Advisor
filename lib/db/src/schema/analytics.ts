import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const analyticsEventsTable = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type", {
    enum: ["message_received", "voice_transcribed", "image_analyzed", "broadcast_sent"],
  }).notNull(),
  phone: text("phone"),
  language: text("language"),
  messagePreview: text("message_preview"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
