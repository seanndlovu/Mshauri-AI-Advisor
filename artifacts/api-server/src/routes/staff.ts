import { and, asc, desc, eq, gte, ilike, isNull, lt, lte, or, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, staffAccessAuditTable, usersTable } from "@workspace/db";
import { requireOwner as defaultRequireOwner } from "../lib/admin-access";
import { getCurrentUser, getVerifiedClerkUser } from "../lib/current-user";
import { logger } from "../lib/logger";
import { hasTrustedMutationOrigin } from "../lib/trusted-origins";

const STAFF_ACCESS_LOCK_ID = 761_943_211;
const STAFF_ROLES = new Set(["owner", "price_editor", "ad_manager"]);
const AUDIT_DEFAULT_PAGE_SIZE = 20;
const AUDIT_MAX_PAGE_SIZE = 100;

type StaffRole = "owner" | "price_editor" | "ad_manager";
type ResolveCurrentUser = typeof getCurrentUser;
type RequireOwner = typeof defaultRequireOwner;

function normalizedBootstrapEmail(): string | null {
  const value = process.env.OWNER_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  return value && value.includes("@") ? value : null;
}

function requestedRole(value: unknown): StaffRole | null | undefined {
  if (value === null) return null;
  return typeof value === "string" && STAFF_ROLES.has(value)
    ? value as StaffRole
    : undefined;
}

function singleQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

function positiveInteger(value: unknown, fallback: number): number | null {
  if (value === undefined) return fallback;
  const parsed = Number(singleQueryValue(value));
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function calendarBoundary(value: unknown, endOfDay: boolean): Date | null | undefined {
  if (value === undefined) return undefined;
  const raw = singleQueryValue(value);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  const [year, month, day] = raw.split("-").map(Number);
  return Number.isNaN(date.getTime())
    || date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
    ? null
    : date;
}

type AuditCursor = { createdAt: string; id: number };

function decodeAuditCursor(value: unknown): { createdAt: Date; id: number } | null | undefined {
  if (value === undefined) return undefined;
  const raw = singleQueryValue(value);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as AuditCursor;
    const createdAt = new Date(parsed.createdAt);
    return Number.isSafeInteger(parsed.id) && parsed.id > 0 && !Number.isNaN(createdAt.getTime())
      ? { createdAt, id: parsed.id }
      : null;
  } catch {
    return null;
  }
}

function encodeAuditCursor(entry: { createdAt: Date; id: number }): string {
  return Buffer.from(JSON.stringify({
    createdAt: entry.createdAt.toISOString(),
    id: entry.id,
  })).toString("base64url");
}

function requireTrustedMutation(req: Request, res: Response): boolean {
  if (hasTrustedMutationOrigin(req)) return true;
  res.status(403).json({ error: "This change must be made from the Mshauri app." });
  return false;
}

function publicStaffUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    adminRole: user.adminRole,
    createdAt: user.createdAt,
  };
}

export function createStaffRouter(options: {
  database?: typeof db;
  resolveCurrentUser?: ResolveCurrentUser;
  resolveBootstrapUser?: ResolveCurrentUser;
  requireOwner?: RequireOwner;
} = {}): IRouter {
  const database = options.database ?? db;
  const resolveCurrentUser = options.resolveCurrentUser ?? getCurrentUser;
  const resolveBootstrapUser = options.resolveBootstrapUser ?? getVerifiedClerkUser;
  const requireOwner = options.requireOwner ?? defaultRequireOwner;
  const router = Router();

  router.get("/admin/staff/bootstrap-status", async (req, res) => {
    const currentUser = await resolveCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: "Please sign in to check owner setup." });
    }

    const [existingOwner] = await database
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.adminRole, "owner"))
      .limit(1);
    const bootstrapEmail = normalizedBootstrapEmail();
    const verifiedClerkUser = await resolveBootstrapUser(req);

    return res.json({
      canBootstrap: Boolean(
        !existingOwner
        && bootstrapEmail
        && verifiedClerkUser
        && verifiedClerkUser.id === currentUser.id
        && verifiedClerkUser.email.toLowerCase() === bootstrapEmail
      ),
      setupComplete: Boolean(existingOwner),
    });
  });

  router.post("/admin/staff/bootstrap-owner", async (req, res) => {
    if (!requireTrustedMutation(req, res)) return;

    const currentUser = await resolveBootstrapUser(req);
    if (!currentUser) {
      return res.status(401).json({
        error: "Sign in with a verified Google or Clerk email account to set up the first Owner.",
      });
    }

    const bootstrapEmail = normalizedBootstrapEmail();
    if (!bootstrapEmail || currentUser.email.toLowerCase() !== bootstrapEmail) {
      return res.status(403).json({ error: "Owner setup is not available for this account." });
    }

    const result = await database.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${STAFF_ACCESS_LOCK_ID})`);

      const [existingOwner] = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.adminRole, "owner"))
        .limit(1);
      if (existingOwner) return { status: "already_complete" as const };

      const [registeredUser] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, currentUser.id))
        .limit(1);
      if (!registeredUser || registeredUser.email.toLowerCase() !== bootstrapEmail) {
        return { status: "not_eligible" as const };
      }

      const previousRole = registeredUser.adminRole;
      const [updated] = await tx
        .update(usersTable)
        .set({ adminRole: "owner", updatedAt: new Date() })
        .where(eq(usersTable.id, registeredUser.id))
        .returning();
      if (updated) {
        await tx.insert(staffAccessAuditTable).values({
          actorUserId: registeredUser.id,
          actorName: registeredUser.name,
          actorEmail: registeredUser.email,
          targetUserId: registeredUser.id,
          targetName: registeredUser.name,
          targetEmail: registeredUser.email,
          previousRole,
          newRole: "owner",
        });
      }
      return updated
        ? { status: "updated" as const, user: updated }
        : { status: "not_eligible" as const };
    });

    if (result.status === "already_complete") {
      return res.status(409).json({ error: "Owner setup has already been completed." });
    }
    if (result.status === "not_eligible") {
      return res.status(403).json({ error: "Owner setup is not available for this account." });
    }

    logger.info(
      { actorUserId: currentUser.id, targetUserId: result.user.id, newAdminRole: "owner" },
      "First Owner access bootstrapped",
    );
    return res.status(201).json({ user: publicStaffUser(result.user) });
  });

  router.get("/admin/staff", async (req, res) => {
    const owner = await requireOwner(req, res);
    if (!owner) return;

    const users = await database
      .select()
      .from(usersTable)
      .orderBy(asc(usersTable.name), asc(usersTable.email));

    return res.json({ users: users.map(publicStaffUser), currentUserId: owner.id });
  });

  router.get("/admin/staff/audit-history", async (req, res) => {
    const owner = await requireOwner(req, res);
    if (!owner) return;

    const requestedPageSize = positiveInteger(req.query.pageSize, AUDIT_DEFAULT_PAGE_SIZE);
    const cursor = decodeAuditCursor(req.query.cursor);
    const actor = singleQueryValue(req.query.actor)?.trim();
    const target = singleQueryValue(req.query.target)?.trim();
    const roleValue = singleQueryValue(req.query.role);
    const role = roleValue === "none"
      ? null
      : roleValue === undefined
        ? undefined
        : requestedRole(roleValue);
    const from = calendarBoundary(req.query.from, false);
    const to = calendarBoundary(req.query.to, true);

    if (
      requestedPageSize === null
      || requestedPageSize > AUDIT_MAX_PAGE_SIZE
      || cursor === null
      || (roleValue !== undefined && roleValue !== "none" && role === undefined)
      || from === null
      || to === null
      || (from && to && from > to)
    ) {
      return res.status(400).json({
        error: `Use a page size up to ${AUDIT_MAX_PAGE_SIZE}, a valid cursor, a valid staff role, and a valid date range.`,
      });
    }

    const filters = [
      actor
        ? or(
            ilike(staffAccessAuditTable.actorName, `%${actor}%`),
            ilike(staffAccessAuditTable.actorEmail, `%${actor}%`),
          )
        : undefined,
      target
        ? or(
            ilike(staffAccessAuditTable.targetName, `%${target}%`),
            ilike(staffAccessAuditTable.targetEmail, `%${target}%`),
          )
        : undefined,
      roleValue === "none"
        ? or(
            isNull(staffAccessAuditTable.previousRole),
            isNull(staffAccessAuditTable.newRole),
          )
        : role
          ? or(
              eq(staffAccessAuditTable.previousRole, role),
              eq(staffAccessAuditTable.newRole, role),
            )
          : undefined,
      from ? gte(staffAccessAuditTable.createdAt, from) : undefined,
      to ? lte(staffAccessAuditTable.createdAt, to) : undefined,
      cursor
        ? or(
            lt(staffAccessAuditTable.createdAt, cursor.createdAt),
            and(
              eq(staffAccessAuditTable.createdAt, cursor.createdAt),
              lt(staffAccessAuditTable.id, cursor.id),
            ),
          )
        : undefined,
    ].filter((filter) => filter !== undefined);
    const where = filters.length > 0 ? and(...filters) : undefined;
    const pageSize = requestedPageSize;

    const rows = await database
      .select()
      .from(staffAccessAuditTable)
      .where(where)
      .orderBy(desc(staffAccessAuditTable.createdAt), desc(staffAccessAuditTable.id))
      .limit(pageSize + 1);
    const hasMore = rows.length > pageSize;
    const entries = hasMore ? rows.slice(0, pageSize) : rows;
    const lastEntry = entries.at(-1);

    return res.json({
      entries,
      pagination: {
        pageSize,
        nextCursor: hasMore && lastEntry ? encodeAuditCursor(lastEntry) : null,
      },
    });
  });

  router.patch("/admin/staff/:userId", async (req, res) => {
    if (!requireTrustedMutation(req, res)) return;

    const owner = await requireOwner(req, res);
    if (!owner) return;

    const userId = Number(req.params.userId);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(400).json({ error: "Choose a valid staff account." });
    }

    const adminRole = requestedRole(req.body?.adminRole);
    if (adminRole === undefined) {
      return res.status(400).json({
        error: "Role must be Owner, Market Price Editor, Ad Manager, or No staff access.",
      });
    }

    const result = await database.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${STAFF_ACCESS_LOCK_ID})`);

      const [activeOwner] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, owner.id))
        .limit(1);
      if (activeOwner?.adminRole !== "owner") {
        return { status: "owner_access_changed" as const };
      }

      const [target] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      if (!target) return { status: "not_found" as const };

      if (target.adminRole === "owner" && adminRole !== "owner") {
        const owners = await tx
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.adminRole, "owner"));
        if (owners.length <= 1) return { status: "last_owner" as const };
      }

      const previousRole = target.adminRole;
      if (previousRole === adminRole) {
        return { status: "unchanged" as const, user: target };
      }
      const [updated] = await tx
        .update(usersTable)
        .set({ adminRole, updatedAt: new Date() })
        .where(eq(usersTable.id, userId))
        .returning();

      if (updated) {
        await tx.insert(staffAccessAuditTable).values({
          actorUserId: activeOwner.id,
          actorName: activeOwner.name,
          actorEmail: activeOwner.email,
          targetUserId: target.id,
          targetName: target.name,
          targetEmail: target.email,
          previousRole,
          newRole: updated.adminRole,
        });
      }
      return updated
        ? { status: "updated" as const, user: updated, previousRole }
        : { status: "not_found" as const };
    });

    if (result.status === "owner_access_changed") {
      return res.status(403).json({ error: "Your Owner access changed. Refresh and try again." });
    }
    if (result.status === "not_found") {
      return res.status(404).json({ error: "That Mshauri account was not found." });
    }
    if (result.status === "last_owner") {
      return res.status(409).json({
        error: "Assign another Owner before removing or changing the final Owner.",
      });
    }
    if (result.status === "unchanged") {
      return res.json({ user: publicStaffUser(result.user) });
    }

    logger.info(
      {
        actorUserId: owner.id,
        targetUserId: result.user.id,
        previousAdminRole: result.previousRole,
        newAdminRole: result.user.adminRole,
      },
      "Staff access changed",
    );
    return res.json({ user: publicStaffUser(result.user) });
  });

  return router;
}

export const staffRouter = createStaffRouter();