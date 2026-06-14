import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, name, location, role } = req.body as {
    email: string;
    password: string;
    name: string;
    location?: string;
    role?: string;
  };

  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password and name are required" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const validRoles = ["farmer", "agribusiness", "extension_officer", "researcher", "ngo"] as const;
  const safeRole = validRoles.includes(role as typeof validRoles[number]) ? (role as typeof validRoles[number]) : "farmer";

  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash,
    name,
    location: location ?? null,
    role: safeRole,
  }).returning();

  req.session.userId = user.id;
  res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role, location: user.location, reputationScore: user.reputationScore });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  req.session.userId = user.id;
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, location: user.location, reputationScore: user.reputationScore });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, location: user.location, reputationScore: user.reputationScore });
});

router.patch("/auth/me", async (req, res): Promise<void> => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { name, location, role } = req.body as { name?: string; location?: string; role?: string };
  const validRoles = ["farmer", "agribusiness", "extension_officer", "researcher", "ngo"] as const;
  const updates: Partial<{ name: string; location: string; role: typeof validRoles[number] }> = {};
  if (name) updates.name = name;
  if (location !== undefined) updates.location = location;
  if (role && validRoles.includes(role as typeof validRoles[number])) updates.role = role as typeof validRoles[number];

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, location: user.location, reputationScore: user.reputationScore });
});

logger.info("Auth routes loaded");

export { router as authRouter };
