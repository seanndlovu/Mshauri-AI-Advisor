import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const broadcastsTable = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  status: text("status", { enum: ["draft", "sending", "sent", "failed"] }).notNull().default("draft"),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBroadcastSchema = createInsertSchema(broadcastsTable).omit({
  id: true,
  recipientCount: true,
  sentAt: true,
  createdAt: true,
});
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;
export type Broadcast = typeof broadcastsTable.$inferSelect;
