import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";

// The routers import the database module at load time. Point it at an invalid,
// local-only address before importing them so this suite cannot connect to a
// configured development or production database.
process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:1/mshauri_test";
process.env.NODE_ENV = "test";
process.env.CORS_ORIGINS = "https://app.mshauri.test";
delete process.env.DOMAIN;
delete process.env.REPLIT_DEV_DOMAIN;

const [{ createAdminAccess }, { createCurrentUserResolver }, { createAdsRouter }, { createMarketPricesRouter }, { createStaffRouter }, schema] = await Promise.all([
  import("../src/lib/admin-access"),
  import("../src/lib/current-user"),
  import("../src/routes/ads"),
  import("../src/routes/market-prices"),
  import("../src/routes/staff"),
  import("@workspace/db"),
]);

const {
  usersTable,
  adsTable,
  marketPriceBatchesTable,
  marketPriceBatchEntriesTable,
  staffAccessAuditTable,
} = schema;

type FakeDatabaseOptions = {
  user?: { id: number; adminRole: "owner" | "price_editor" | "ad_manager" | null };
  users?: Record<string, unknown>[];
  batches?: Record<string, unknown>[];
  entries?: Record<string, unknown>[];
  ads?: Record<string, unknown>[];
  audits?: Record<string, unknown>[];
};

function createFakeDatabase({
  user,
  users = user ? [user] : [],
  batches = [],
  entries = [],
  ads = [],
  audits = [],
}: FakeDatabaseOptions = {}) {
  function conditionValue(conditions: unknown[], column: unknown): unknown {
    const expectedName = (column as { name?: string })?.name;
    for (const condition of conditions) {
      const chunks = (condition as { queryChunks?: unknown[] })?.queryChunks;
      if (!chunks) continue;

      let matchingColumn = false;
      for (const chunk of chunks) {
        if (
          chunk === column
          || (
            expectedName
            && (chunk as { name?: string })?.name === expectedName
            && (chunk as { columnType?: string })?.columnType !== undefined
          )
        ) {
          matchingColumn = true;
          continue;
        }
        if (matchingColumn && (chunk as { constructor?: { name?: string } })?.constructor?.name === "Param") {
          return (chunk as { value: unknown }).value;
        }
        const nestedValue = conditionValue([chunk], column);
        if (nestedValue !== undefined) return nestedValue;
      }
    }
    return undefined;
  }

  function matchingRows(table: unknown, conditions: unknown[]) {
    if (table === usersTable) {
      const userId = conditionValue(conditions, usersTable.id);
      const email = conditionValue(conditions, usersTable.email);
      const adminRole = conditionValue(conditions, usersTable.adminRole);
      return users.filter((candidate) =>
        (userId === undefined || candidate.id === userId)
        && (email === undefined || candidate.email === email)
        && (adminRole === undefined || candidate.adminRole === adminRole)
      );
    }
    if (table === adsTable) return ads;
    if (table === staffAccessAuditTable) return audits;
    if (table === marketPriceBatchesTable) {
      const id = conditionValue(conditions, marketPriceBatchesTable.id);
      const status = conditionValue(conditions, marketPriceBatchesTable.status);
      return batches.filter((batch) => (id === undefined || batch.id === id) && (status === undefined || batch.status === status));
    }
    if (table === marketPriceBatchEntriesTable) {
      const batchId = conditionValue(conditions, marketPriceBatchEntriesTable.batchId);
      return entries.filter((entry) => batchId === undefined || entry.batchId === batchId);
    }
    return [];
  }

  return {
    select() {
      let table: unknown;
      let conditions: unknown[] = [];
      const rows = () => matchingRows(table, conditions);

      const query = {
        from(nextTable: unknown) {
          table = nextTable;
          return query;
        },
        where(...nextConditions: unknown[]) {
          conditions = nextConditions;
          return query;
        },
        orderBy() {
          return query;
        },
        limit(limit: number) {
          return Promise.resolve(rows().slice(0, limit));
        },
        then<TResult1 = unknown[], TResult2 = never>(
          onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          return Promise.resolve(rows()).then(onfulfilled, onrejected);
        },
      };

      return query;
    },
    update(table: unknown) {
      let values: Record<string, unknown> = {};
      let conditions: unknown[] = [];
      let applied = false;

      const apply = () => {
        if (applied) return matchingRows(table, conditions);
        applied = true;
        const updated = matchingRows(table, conditions);
        updated.forEach((row) => Object.assign(row, values));
        return updated;
      };

      const query = {
        set(nextValues: Record<string, unknown>) {
          values = nextValues;
          return query;
        },
        where(...nextConditions: unknown[]) {
          conditions = nextConditions;
          return query;
        },
        returning() {
          return Promise.resolve(apply());
        },
        then<TResult1 = unknown[], TResult2 = never>(
          onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          return Promise.resolve(apply()).then(onfulfilled, onrejected);
        },
      };

      return query;
    },
    insert(table: unknown) {
      let values: Record<string, unknown> = {};
      let applied = false;
      const apply = () => {
        if (applied) return [];
        applied = true;
        if (table === staffAccessAuditTable) {
          const inserted = { id: audits.length + 1, createdAt: new Date(), ...values };
          audits.push(inserted);
          return [inserted];
        }
        if (table !== usersTable) return [];
        const existing = users.find((candidate) => candidate.email === values.email);
        if (existing) return [];
        const inserted = { id: users.length + 1, adminRole: null, ...values };
        users.push(inserted);
        return [inserted];
      };
      const query = {
        values(nextValues: Record<string, unknown>) {
          values = nextValues;
          return query;
        },
        onConflictDoNothing() {
          return query;
        },
        returning() {
          return Promise.resolve(apply());
        },
        then<TResult1 = unknown[], TResult2 = never>(
          onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          return Promise.resolve(apply()).then(onfulfilled, onrejected);
        },
      };
      return query;
    },
    transaction<T>(callback: (transaction: unknown) => Promise<T>) {
      return callback(this);
    },
    execute() {
      return Promise.resolve([]);
    },
  };
}

async function requestRouter(
  router: Parameters<typeof createMarketPricesRouter>[0] extends never ? never : unknown,
  path: string,
  init: RequestInit = {},
  userId?: number,
) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    Object.assign(req, { session: userId ? { userId } : {} });
    next();
  });
  app.use("/api", router as express.Router);

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api${path}`, init);
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
    };
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function routerForRole(role: "owner" | "price_editor" | "ad_manager") {
  const database = createFakeDatabase({ user: { id: 1, adminRole: role } });
  const access = createAdminAccess(
    database as never,
    createCurrentUserResolver(database as never, () => null, async () => ({})),
  );
  return {
    prices: createMarketPricesRouter({
      database: database as never,
      requirePriceAdmin: access.requirePriceAdmin,
    }),
    ads: createAdsRouter({
      database: database as never,
      requireAdAdmin: access.requireAdAdmin,
    }),
  };
}

test("staff roles only access their assigned admin desk", async () => {
  const expectations = [
    { role: "owner" as const, prices: 200, ads: 200 },
    { role: "price_editor" as const, prices: 200, ads: 403 },
    { role: "ad_manager" as const, prices: 403, ads: 200 },
  ];

  for (const expectation of expectations) {
    const routers = routerForRole(expectation.role);
    const prices = await requestRouter(routers.prices, "/admin/market-price-batches", {}, 1);
    const ads = await requestRouter(routers.ads, "/admin/ads", {}, 1);

    assert.equal(prices.status, expectation.prices, `${expectation.role} market-price access`);
    assert.equal(ads.status, expectation.ads, `${expectation.role} ads access`);
  }
});

test("Clerk identity is canonical when Clerk and legacy sessions conflict", async () => {
  const owner = { id: 1, email: "owner@example.com", adminRole: "owner" as const };
  const member = { id: 2, email: "member@example.com", adminRole: null };
  const database = createFakeDatabase({ users: [owner, member] });
  const resolveCurrentUser = createCurrentUserResolver(
    database as never,
    (req) => {
      const email = req.header("x-test-clerk-email");
      return email
        ? ({ userId: `clerk-${email}`, sessionClaims: {} } as never)
        : null;
    },
    async (clerkUserId) => ({
      primaryEmailAddress: {
        emailAddress: clerkUserId.replace(/^clerk-/, ""),
        verification: { status: "verified" },
      },
    }),
  );
  const access = createAdminAccess(database as never, resolveCurrentUser);
  const router = createAdsRouter({
    database: database as never,
    requireAdAdmin: access.requireAdAdmin,
  });

  const legacyOwner = await requestRouter(router, "/admin/ads", {}, owner.id);
  const clerkMember = await requestRouter(router, "/admin/ads", {
    headers: { "x-test-clerk-email": member.email },
  });
  const conflictingSessions = await requestRouter(router, "/admin/ads", {
    headers: { "x-test-clerk-email": member.email },
  }, owner.id);

  assert.equal(legacyOwner.status, 200);
  assert.equal(clerkMember.status, 403);
  assert.equal(conflictingSessions.status, 403, "retained legacy owner session must not override Clerk member");
});

test("default Clerk claims provision a normal user from verified profile data", async () => {
  const users: Record<string, unknown>[] = [];
  const database = createFakeDatabase({ users });
  const resolveCurrentUser = createCurrentUserResolver(
    database as never,
    () => ({ userId: "clerk-new-user", sessionClaims: {} } as never),
    async () => ({
      primaryEmailAddress: {
        emailAddress: "new.user@example.com",
        verification: { status: "verified" },
      },
      firstName: "New",
      lastName: "User",
    }),
  );

  const resolved = await resolveCurrentUser({ session: {} } as never);

  assert.equal(resolved?.email, "new.user@example.com");
  assert.equal(resolved?.name, "New User");
  assert.equal(resolved?.role, "farmer");
  assert.equal(resolved?.adminRole, null);
});

test("admin mutations reject untrusted origins before authentication", async () => {
  const database = createFakeDatabase();
  const access = createAdminAccess(database as never);
  const protectedRoutes = [
    {
      name: "market price batches",
      router: createMarketPricesRouter({
        database: database as never,
        requirePriceAdmin: access.requirePriceAdmin,
      }),
      path: "/admin/market-price-batches",
    },
    {
      name: "ads",
      router: createAdsRouter({
        database: database as never,
        requireAdAdmin: access.requireAdAdmin,
      }),
      path: "/admin/ads",
    },
    {
      name: "staff access",
      router: createStaffRouter({
        database: database as never,
        requireOwner: access.requireOwner,
      }),
      path: "/admin/staff/1",
      method: "PATCH",
    },
  ];

  for (const route of protectedRoutes) {
    const method = route.method ?? "POST";
    const missing = await requestRouter(route.router, route.path, { method });
    const hostile = await requestRouter(route.router, route.path, {
      method,
      headers: { Origin: "https://attacker.example" },
    });
    const configured = await requestRouter(route.router, route.path, {
      method,
      headers: { Origin: "https://app.mshauri.test" },
    });

    assert.equal(missing.status, 403, `${route.name} rejects missing origins`);
    assert.equal(hostile.status, 403, `${route.name} rejects hostile origins`);
    assert.equal(configured.status, 401, `${route.name} reaches authentication for the configured origin`);
  }
});

test("only the configured verified account can bootstrap the first Owner once", async () => {
  process.env.OWNER_BOOTSTRAP_EMAIL = "trusted.owner@example.com";
  const users = [
    {
      id: 1,
      email: "trusted.owner@example.com",
      name: "Trusted Owner",
      role: "farmer",
      adminRole: null,
      passwordHash: null,
      location: null,
      reputationScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      email: "member@example.com",
      name: "Member",
      role: "farmer",
      adminRole: null,
      passwordHash: null,
      location: null,
      reputationScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const audits: Record<string, unknown>[] = [];
  const database = createFakeDatabase({ users, audits });
  const readTestClerkAuth = (req: express.Request) => {
    const email = req.header("x-test-clerk-email");
    return email ? ({ userId: `clerk-${email}`, sessionClaims: {} } as never) : null;
  };
  const readVerifiedClerkUser = async (clerkUserId: string) => ({
    primaryEmailAddress: {
      emailAddress: clerkUserId.replace(/^clerk-/, ""),
      verification: { status: "verified" },
    },
  });
  const resolveCurrentUser = createCurrentUserResolver(
    database as never,
    readTestClerkAuth,
    readVerifiedClerkUser,
  );
  const resolveBootstrapUser = createCurrentUserResolver(
    database as never,
    readTestClerkAuth,
    readVerifiedClerkUser,
    true,
  );
  const router = createStaffRouter({
    database: database as never,
    resolveCurrentUser,
    resolveBootstrapUser,
  });
  const unverifiedResolver = createCurrentUserResolver(
    database as never,
    readTestClerkAuth,
    async () => ({
      primaryEmailAddress: {
        emailAddress: "trusted.owner@example.com",
        verification: { status: "unverified" },
      },
    }),
    true,
  );
  const unverifiedRouter = createStaffRouter({
    database: database as never,
    resolveCurrentUser: unverifiedResolver,
    resolveBootstrapUser: unverifiedResolver,
  });

  const signedOut = await requestRouter(router, "/admin/staff/bootstrap-owner", {
    method: "POST",
    headers: { Origin: "https://app.mshauri.test" },
  });
  const wrongAccount = await requestRouter(router, "/admin/staff/bootstrap-owner", {
    method: "POST",
    headers: {
      Origin: "https://app.mshauri.test",
      "x-test-clerk-email": "member@example.com",
    },
  });
  const hostileOrigin = await requestRouter(router, "/admin/staff/bootstrap-owner", {
    method: "POST",
    headers: {
      Origin: "https://attacker.example",
      "x-test-clerk-email": "trusted.owner@example.com",
    },
  });
  const legacyOnly = await requestRouter(router, "/admin/staff/bootstrap-owner", {
    method: "POST",
    headers: { Origin: "https://app.mshauri.test" },
  }, 1);
  const unverifiedClerk = await requestRouter(unverifiedRouter, "/admin/staff/bootstrap-owner", {
    method: "POST",
    headers: {
      Origin: "https://app.mshauri.test",
      "x-test-clerk-email": "trusted.owner@example.com",
    },
  }, 1);
  const firstClaim = await requestRouter(router, "/admin/staff/bootstrap-owner", {
    method: "POST",
    headers: {
      Origin: "https://app.mshauri.test",
      "x-test-clerk-email": "trusted.owner@example.com",
    },
  });
  const repeatedClaim = await requestRouter(router, "/admin/staff/bootstrap-owner", {
    method: "POST",
    headers: {
      Origin: "https://app.mshauri.test",
      "x-test-clerk-email": "trusted.owner@example.com",
    },
  });

  assert.equal(signedOut.status, 401);
  assert.equal(wrongAccount.status, 403);
  assert.equal(hostileOrigin.status, 403);
  assert.equal(legacyOnly.status, 401);
  assert.equal(unverifiedClerk.status, 401, "unverified Clerk identity must override a retained legacy session");
  assert.equal(firstClaim.status, 201);
  assert.equal(users[0].adminRole, "owner");
  assert.equal(repeatedClaim.status, 409);
  assert.equal(audits.length, 1);
  assert.deepEqual(
    {
      actorUserId: audits[0].actorUserId,
      targetUserId: audits[0].targetUserId,
      previousRole: audits[0].previousRole,
      newRole: audits[0].newRole,
    },
    { actorUserId: 1, targetUserId: 1, previousRole: null, newRole: "owner" },
  );
});

test("Owners can assign staff roles without ever removing the final Owner", async () => {
  const users = [
    {
      id: 1,
      email: "owner@example.com",
      name: "Owner",
      role: "farmer",
      adminRole: "owner",
      passwordHash: null,
      location: null,
      reputationScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      email: "manager@example.com",
      name: "Manager",
      role: "farmer",
      adminRole: null,
      passwordHash: null,
      location: null,
      reputationScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      email: "member@example.com",
      name: "Member",
      role: "farmer",
      adminRole: null,
      passwordHash: null,
      location: null,
      reputationScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const audits: Record<string, unknown>[] = [];
  const database = createFakeDatabase({ users, audits });
  const resolveCurrentUser = createCurrentUserResolver(database as never, () => null, async () => ({}));
  const access = createAdminAccess(database as never, resolveCurrentUser);
  const router = createStaffRouter({
    database: database as never,
    resolveCurrentUser,
    requireOwner: access.requireOwner,
  });
  const mutation = (userId: number, adminRole: unknown, actorId = 1) => requestRouter(
    router,
    `/admin/staff/${userId}`,
    {
      method: "PATCH",
      headers: { Origin: "https://app.mshauri.test", "Content-Type": "application/json" },
      body: JSON.stringify({ adminRole }),
    },
    actorId,
  );

  const finalOwnerRemoval = await mutation(1, null);
  const assignPriceEditor = await mutation(2, "price_editor");
  const assignSecondOwner = await mutation(2, "owner");
  const transferOwnership = await mutation(1, null);
  const removeNewFinalOwner = await mutation(2, null, 2);
  const invalidRole = await mutation(3, "super_admin", 2);
  const nonOwnerList = await requestRouter(router, "/admin/staff", {}, 3);
  const nonOwnerMutation = await mutation(3, "ad_manager", 3);
  const history = await requestRouter(router, "/admin/staff/audit-history", {}, 2);

  assert.equal(finalOwnerRemoval.status, 409);
  assert.equal(assignPriceEditor.status, 200);
  assert.equal(assignSecondOwner.status, 200);
  assert.equal(transferOwnership.status, 200);
  assert.equal(removeNewFinalOwner.status, 409);
  assert.equal(invalidRole.status, 400);
  assert.equal(nonOwnerList.status, 403);
  assert.equal(nonOwnerMutation.status, 403);
  assert.equal(users[0].adminRole, null);
  assert.equal(users[1].adminRole, "owner");
  assert.equal(audits.length, 3, "only successful role changes are audited");
  assert.equal(history.status, 200);
  assert.equal((history.body as { entries: unknown[] }).entries.length, 3);
});

test("publishing an edition archives the previous edition and exposes only the new one", async () => {
  const now = new Date("2026-08-21T10:00:00.000Z");
  const draftBatch = {
    id: 10,
    name: "Draft price edition",
    source: "Test price desk",
    observedDate: "2026-08-21",
    status: "draft",
    createdBy: 1,
    publishedBy: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const publishedBatch = {
    ...draftBatch,
    id: 11,
    name: "Published price edition",
    status: "published",
    publishedBy: 1,
    publishedAt: now,
  };
  const draftEntry = {
    id: 20,
    batchId: draftBatch.id,
    commodity: "Draft beans",
    grade: null,
    unit: "10 kg",
    market: "Harare",
    priceUsd: "99.00",
    priceZig: null,
    observedDate: "2026-08-21",
    source: "Test price desk",
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
  const publishedEntry = {
    ...draftEntry,
    id: 21,
    batchId: publishedBatch.id,
    commodity: "Published maize",
    grade: "Grade A",
    priceUsd: "12.50",
  };
  const database = createFakeDatabase({
    user: { id: 1, adminRole: "owner" },
    batches: [draftBatch, publishedBatch],
    entries: [draftEntry, publishedEntry],
  });
  const access = createAdminAccess(
    database as never,
    createCurrentUserResolver(database as never, () => null, async () => ({})),
  );
  const router = createMarketPricesRouter({
    database: database as never,
    requirePriceAdmin: access.requirePriceAdmin,
  });

  const publish = await requestRouter(router, `/admin/market-price-batches/${draftBatch.id}/publish`, {
    method: "POST",
    headers: { Origin: "https://app.mshauri.test" },
  }, 1);

  assert.equal(publish.status, 200);
  assert.equal(draftBatch.status, "published");
  assert.equal(draftBatch.publishedBy, 1);
  assert.ok(draftBatch.publishedAt instanceof Date);
  assert.equal(publishedBatch.status, "archived");
  assert.equal([draftBatch, publishedBatch].filter((batch) => batch.status === "published").length, 1);

  const response = await requestRouter(router, "/market-prices");

  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(response.body).sort(), ["data", "edition"]);
  assert.equal(response.body.edition.id, draftBatch.id);
  assert.equal(response.body.edition.status, "published");
  assert.deepEqual(response.body.data.map((entry: { commodity: string }) => entry.commodity), ["Draft beans"]);
  assert.equal(response.body.data[0].quantity, "10 kg");
});