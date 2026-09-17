import { index, pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const staffAccessAuditTable = pgTable(
  "staff_access_audit",
  {
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
  },
  (table) => [
    index("staff_access_audit_created_at_id_idx").on(table.createdAt.desc(), table.id.desc()),
    index("staff_access_audit_actor_name_trgm_idx").using("gin", table.actorName.asc().op("gin_trgm_ops")),
    index("staff_access_audit_actor_email_trgm_idx").using("gin", table.actorEmail.asc().op("gin_trgm_ops")),
    index("staff_access_audit_target_name_trgm_idx").using("gin", table.targetName.asc().op("gin_trgm_ops")),
    index("staff_access_audit_target_email_trgm_idx").using("gin", table.targetEmail.asc().op("gin_trgm_ops")),
    index("staff_access_audit_previous_role_idx").on(table.previousRole),
    index("staff_access_audit_new_role_idx").on(table.newRole),
  ],
);

export const insertStaffAccessAuditSchema = createInsertSchema(staffAccessAuditTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStaffAccessAudit = z.infer<typeof insertStaffAccessAuditSchema>;
export type StaffAccessAudit = typeof staffAccessAuditTable.$inferSelect;