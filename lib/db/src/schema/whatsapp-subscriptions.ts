import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const whatsappSubscriptionsTable = pgTable("whatsapp_subscriptions", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  communitySlug: text("community_slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("wa_subs_phone_slug_idx").on(t.phone, t.communitySlug),
]);

export type WhatsappSubscription = typeof whatsappSubscriptionsTable.$inferSelect;
