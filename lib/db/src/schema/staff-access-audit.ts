import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const staffAccessAuditTable = pgTable("staff_access_audit", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id").notNull().references(() => usersTable.id),
  actorName: text("actor_name").notNull(),
  actorEmail: text("actor_email").notNull(),
  targetUserId: integer("target_user_id").notNull().references(() => usersTable.id),
  targetName: text("target_name").notNull(),
  targetEmail: text("target_email").notNull(),
  previousRole: text("previous_role", { enum: ["owner", "price_editor", "ad_manager"] }),
  newRole: text("new_role", { enum: ["owner", "price_editor", "ad_manager"] }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStaffAccessAuditSchema = createInsertSchema(staffAccessAuditTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStaffAccessAudit = z.infer<typeof insertStaffAccessAuditSchema>;
export type StaffAccessAudit = typeof staffAccessAuditTable.$inferSelect;