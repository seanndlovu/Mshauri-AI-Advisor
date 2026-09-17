import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";
import { logger } from "../lib/logger";
import { getCurrentUser } from "../lib/current-user";

const router: IRouter = Router();

function formatUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    adminRole: user.adminRole,
    location: user.location,
    reputationScore: user.reputationScore,
  };
}

router.post("/auth/legacy-login", async (req, res): Promise<void> => {
  try {
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

    if (!user.passwordHash) {
      res.status(409).json({ error: "This account uses Google or Clerk email sign-in." });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    req.session.userId = user.id;
    res.json(formatUser(user));
  } catch (error) {
    logger.error({ err: error }, "Legacy sign-in failed unexpectedly");
    res.status(500).json({ error: "Legacy sign-in is temporarily unavailable. Use secure sign-in or try again later." });
  }
});

router.post("/auth/legacy-logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await getCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json(formatUser(user));
});

router.patch("/auth/me", async (req, res): Promise<void> => {
  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { name, location, role } = req.body as { name?: string; location?: string; role?: string };
  const validRoles = ["farmer", "agribusiness", "extension_officer", "researcher", "ngo"] as const;
  const updates: Partial<{ name: string; location: string; role: typeof validRoles[number] }> = {};
  if (name) updates.name = name;
  if (location !== undefined) updates.location = location;
  if (role && validRoles.includes(role as typeof validRoles[number])) updates.role = role as typeof validRoles[number];

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, currentUser.id)).returning();
  res.json(formatUser(user));
});

logger.info("Auth routes loaded");

export { router as authRouter };
