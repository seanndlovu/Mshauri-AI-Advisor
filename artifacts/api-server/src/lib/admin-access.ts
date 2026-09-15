import type { Request, Response } from "express";
import { db, type User } from "@workspace/db";
import { getCurrentUser } from "./current-user";

export type PriceAdminRole = "owner" | "price_editor";
export type AdAdminRole = "owner" | "ad_manager";
export type OwnerRole = "owner";
export type AdminAccessDatabase = Pick<typeof db, "select">;
export type CurrentUserResolver = typeof getCurrentUser;

export function canManagePrices(role: string | null | undefined): role is PriceAdminRole {
  return role === "owner" || role === "price_editor";
}

export function canManageAds(role: string | null | undefined): role is AdAdminRole {
  return role === "owner" || role === "ad_manager";
}

export function isOwner(role: string | null | undefined): role is OwnerRole {
  return role === "owner";
}

export function createAdminAccess(
  database: AdminAccessDatabase,
  resolveCurrentUser: CurrentUserResolver = getCurrentUser,
) {
  async function requireAdmin(
    req: Request,
    res: Response,
    canManage: (role: string | null | undefined) => boolean,
    area: string,
  ): Promise<User | null> {
    const existing = await resolveCurrentUser(req);
    if (!existing) {
      res.status(401).json({ error: `Please sign in to manage ${area}.` });
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
    requireOwner(req: Request, res: Response): Promise<User | null> {
      return requireAdmin(req, res, isOwner, "staff access");
    },
  };
}

const adminAccess = createAdminAccess(db);
export const { requirePriceAdmin, requireAdAdmin, requireOwner } = adminAccess;