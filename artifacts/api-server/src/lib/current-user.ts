import { clerkClient, getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import type { Request } from "express";
import { db, usersTable, type User } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

type MshauriClaims = {
  email?: string;
  firstName?: string;
  lastName?: string;
};

type CurrentUserDatabase = Pick<typeof db, "select" | "insert">;
type ClerkAuthReader = (req: Request) => ReturnType<typeof getAuth> | null;
type ClerkIdentity = {
  primaryEmailAddress?: {
    emailAddress?: string | null;
    verification?: { status?: string | null } | null;
  } | null;
  firstName?: string | null;
  lastName?: string | null;
};
type ClerkUserReader = (clerkUserId: string) => Promise<ClerkIdentity>;

function normalizedEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.includes("@") ? email : null;
}

export function createCurrentUserResolver(
  database: CurrentUserDatabase,
  readClerkAuth: ClerkAuthReader,
  readClerkUser: ClerkUserReader,
  clerkOnly = false,
) {
  return async function resolveCurrentUser(req: Request): Promise<User | null> {
    const auth = readClerkAuth(req);
    if (auth?.userId) {
      // Clerk is canonical whenever present. Never fall back to a retained
      // legacy session for the same request.
      const claims = auth.sessionClaims as MshauriClaims | undefined;
      const clerkUser = await readClerkUser(auth.userId);
      const primaryEmail = clerkUser.primaryEmailAddress;
      const email = primaryEmail?.verification?.status === "verified"
        ? normalizedEmail(primaryEmail.emailAddress)
        : null;
      if (!email) return null;

      let [user] = await database.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
      if (!user) {
        const name = [
          clerkUser.firstName ?? claims?.firstName,
          clerkUser.lastName ?? claims?.lastName,
        ].filter(Boolean).join(" ").trim()
          || email.split("@")[0]
          || "Mshauri member";
        const [inserted] = await database
          .insert(usersTable)
          .values({ email, name, passwordHash: null, role: "farmer" })
          .onConflictDoNothing()
          .returning();
        user = inserted;
        if (!user) {
          [user] = await database.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
        }
      }
      return user ?? null;
    }

    if (clerkOnly) return null;

    const legacyUserId = req.session?.userId;
    if (!legacyUserId) return null;
    const [legacyUser] = await database.select().from(usersTable).where(eq(usersTable.id, legacyUserId)).limit(1);
    return legacyUser ?? null;
  };
}

const readDefaultClerkAuth: ClerkAuthReader = (req) => {
  try {
    return getAuth(req);
  } catch {
    // Unit-mounted routers and legacy-only requests do not have Clerk context.
    return null;
  }
};
const readDefaultClerkUser: ClerkUserReader = (clerkUserId) =>
  clerkClient.users.getUser(clerkUserId);

export const getCurrentUser = createCurrentUserResolver(
  db,
  readDefaultClerkAuth,
  readDefaultClerkUser,
);

export const getVerifiedClerkUser = createCurrentUserResolver(
  db,
  readDefaultClerkAuth,
  readDefaultClerkUser,
  true,
);