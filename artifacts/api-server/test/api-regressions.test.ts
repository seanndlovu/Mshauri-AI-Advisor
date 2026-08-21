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

const [{ createAdminAccess }, { createAdsRouter }, { createMarketPricesRouter }, schema] = await Promise.all([
  import("../src/lib/admin-access"),
  import("../src/routes/ads"),
  import("../src/routes/market-prices"),
  import("@workspace/db"),
]);

const {
  usersTable,
  adsTable,
  marketPriceBatchesTable,
  marketPriceBatchEntriesTable,
} = schema;

type FakeDatabaseOptions = {
  user?: { id: number; adminRole: "owner" | "price_editor" | "ad_manager" | null };
  batches?: Record<string, unknown>[];
  entries?: Record<string, unknown>[];
  ads?: Record<string, unknown>[];
};

function createFakeDatabase({
  user,
  batches = [],
  entries = [],
  ads = [],
}: FakeDatabaseOptions = {}) {
  function conditionValue(conditions: unknown[], column: unknown): unknown {
    for (const condition of conditions) {
      const chunks = (condition as { queryChunks?: unknown[] })?.queryChunks;
      if (!chunks) continue;

      let matchingColumn = false;
      for (const chunk of chunks) {
        if (chunk === column) {
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
      return user && user.id === userId ? [user] : [];
    }
    if (table === adsTable) return ads;
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
    transaction<T>(callback: (transaction: unknown) => Promise<T>) {
      return callback(this);
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
  const access = createAdminAccess(database as never);
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
  ];

  for (const route of protectedRoutes) {
    const missing = await requestRouter(route.router, route.path, { method: "POST" });
    const hostile = await requestRouter(route.router, route.path, {
      method: "POST",
      headers: { Origin: "https://attacker.example" },
    });
    const configured = await requestRouter(route.router, route.path, {
      method: "POST",
      headers: { Origin: "https://app.mshauri.test" },
    });

    assert.equal(missing.status, 403, `${route.name} rejects missing origins`);
    assert.equal(hostile.status, 403, `${route.name} rejects hostile origins`);
    assert.equal(configured.status, 401, `${route.name} reaches authentication for the configured origin`);
  }
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
  const access = createAdminAccess(database as never);
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