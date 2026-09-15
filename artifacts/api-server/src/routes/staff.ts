import { asc, eq, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { requireOwner as defaultRequireOwner } from "../lib/admin-access";
import { getCurrentUser, getVerifiedClerkUser } from "../lib/current-user";
import { logger } from "../lib/logger";
import { hasTrustedMutationOrigin } from "../lib/trusted-origins";

const STAFF_ACCESS_LOCK_ID = 761_943_211;
const STAFF_ROLES = new Set(["owner", "price_editor", "ad_manager"]);

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

      const [updated] = await tx
        .update(usersTable)
        .set({ adminRole: "owner", updatedAt: new Date() })
        .where(eq(usersTable.id, registeredUser.id))
        .returning();
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
      const [updated] = await tx
        .update(usersTable)
        .set({ adminRole, updatedAt: new Date() })
        .where(eq(usersTable.id, userId))
        .returning();

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