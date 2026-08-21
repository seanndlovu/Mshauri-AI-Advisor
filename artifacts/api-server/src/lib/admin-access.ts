import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";

export type PriceAdminRole = "owner" | "price_editor";
export type AdAdminRole = "owner" | "ad_manager";
export type AdminAccessDatabase = Pick<typeof db, "select">;

export function canManagePrices(role: string | null | undefined): role is PriceAdminRole {
  return role === "owner" || role === "price_editor";
}

export function canManageAds(role: string | null | undefined): role is AdAdminRole {
  return role === "owner" || role === "ad_manager";
}

export function createAdminAccess(database: AdminAccessDatabase) {
  async function requireAdmin(
    req: Request,
    res: Response,
    canManage: (role: string | null | undefined) => boolean,
    area: string,
  ): Promise<User | null> {
    const userId = req.session.userId;
    if (!userId) {
      res.status(401).json({ error: `Please sign in to manage ${area}.` });
      return null;
    }

    const [existing] = await database.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!existing) {
      res.status(401).json({ error: "Your account could not be found." });
      return null;
    }

    if (!canManage(existing.adminRole)) {
      res.status(403).json({ error: `You do not have permission to manage ${area}.` });
      return null;
    }

    return existing;
  }

  return {
    requirePriceAdmin(req: Request, res: Response): Promise<User | null> {
      return requireAdmin(req, res, canManagePrices, "market prices");
    },
    requireAdAdmin(req: Request, res: Response): Promise<User | null> {
      return requireAdmin(req, res, canManageAds, "advertising campaigns");
    },
  };
}

const adminAccess = createAdminAccess(db);
export const { requirePriceAdmin, requireAdAdmin } = adminAccess;