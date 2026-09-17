import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, beforeEach, test } from "node:test";
import { drizzle } from "drizzle-orm/node-postgres";
import express from "express";

process.env.NODE_ENV = "test";
process.env.CORS_ORIGINS = "https://app.mshauri.test";

const [{ pool, staffAccessAuditTable, usersTable }, { createStaffRouter }] = await Promise.all([
  import("@workspace/db"),
  import("../src/routes/staff"),
]);

const client = await pool.connect();
const database = drizzle(client);

const owner = {
  id: 1,
  email: "owner@example.com",
  name: "Owner",
  role: "farmer" as const,
  adminRole: "owner" as const,
  passwordHash: null,
  location: null,
  reputationScore: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function changeRole(adminRole: "price_editor" | "ad_manager") {
  const router = createStaffRouter({
    database: database as never,
    requireOwner: async () => owner,
  });
  const app = express();
  app.use(express.json());
  app.use("/api", router as express.Router);
  app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: "Database write failed." });
  });

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/staff/2`, {
      method: "PATCH",
      headers: {
        Origin: "https://app.mshauri.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminRole }),
    });
    return response.status;
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

async function auditHistory(query = "") {
  const router = createStaffRouter({
    database: database as never,
    requireOwner: async () => owner,
  });
  const app = express();
  app.use("/api", router as express.Router);
  app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: "Database read failed." });
  });

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/admin/staff/audit-history${query}`,
    );
    return {
      status: response.status,
      body: await response.json() as {
        entries?: Array<{ id: number; actorName: string; targetName: string }>;
        pagination?: { pageSize: number; nextCursor: string | null };
        error?: string;
      },
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

async function persistedState() {
  const [target] = await database
    .select({ adminRole: usersTable.adminRole })
    .from(usersTable)
    .where((await import("drizzle-orm")).eq(usersTable.id, 2));
  const audits = await database.select().from(staffAccessAuditTable);
  return { adminRole: target?.adminRole, audits };
}

before(async () => {
  await client.query(`
    CREATE TEMP TABLE users (
      id serial PRIMARY KEY,
      email text NOT NULL UNIQUE,
      password_hash text,
      name text NOT NULL,
      location text,
      role text NOT NULL DEFAULT 'farmer',
      admin_role text,
      reputation_score integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TEMP TABLE staff_access_audit (
      id serial PRIMARY KEY,
      actor_user_id integer NOT NULL REFERENCES users(id),
      actor_name text NOT NULL,
      actor_email text NOT NULL,
      target_user_id integer NOT NULL REFERENCES users(id),
      target_name text NOT NULL,
      target_email text NOT NULL,
      previous_role text,
      new_role text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TEMP TABLE staff_write_failures (
      operation text PRIMARY KEY
    );
    CREATE FUNCTION pg_temp.fail_selected_staff_write() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM staff_write_failures
        WHERE operation = TG_ARGV[0]
      ) THEN
        RAISE EXCEPTION 'forced % failure', TG_ARGV[0];
      END IF;
      RETURN NEW;
    END;
    $$;
    CREATE TRIGGER force_role_update_failure
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_selected_staff_write('role_update');
    CREATE TRIGGER force_audit_insert_failure
      BEFORE INSERT ON staff_access_audit
      FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_selected_staff_write('audit_insert');
  `);
});

beforeEach(async () => {
  await client.query(`
    DELETE FROM staff_write_failures;
    DELETE FROM staff_access_audit;
    DELETE FROM users;
    ALTER SEQUENCE users_id_seq RESTART WITH 1;
    ALTER SEQUENCE staff_access_audit_id_seq RESTART WITH 1;
    INSERT INTO users (email, name, admin_role)
    VALUES ('owner@example.com', 'Owner', 'owner'),
           ('staff@example.com', 'Staff member', NULL);
  `);
});

after(async () => {
  client.release();
  await pool.end();
});

test("successful staff role and audit writes commit together", async () => {
  assert.equal(await changeRole("price_editor"), 200);

  const state = await persistedState();
  assert.equal(state.adminRole, "price_editor");
  assert.equal(state.audits.length, 1);
  assert.deepEqual(
    {
      actorUserId: state.audits[0].actorUserId,
      targetUserId: state.audits[0].targetUserId,
      previousRole: state.audits[0].previousRole,
      newRole: state.audits[0].newRole,
    },
    { actorUserId: 1, targetUserId: 2, previousRole: null, newRole: "price_editor" },
  );
});

test("an audit insert failure rolls back the staff role change", async () => {
  await client.query("INSERT INTO staff_write_failures (operation) VALUES ('audit_insert')");

  assert.equal(await changeRole("price_editor"), 500);

  const state = await persistedState();
  assert.equal(state.adminRole, null);
  assert.equal(state.audits.length, 0);
});

test("a role update failure creates no staff audit entry", async () => {
  await client.query("INSERT INTO staff_write_failures (operation) VALUES ('role_update')");

  assert.equal(await changeRole("ad_manager"), 500);

  const state = await persistedState();
  assert.equal(state.adminRole, null);
  assert.equal(state.audits.length, 0);
});

test("staff audit history filters and keyset pagination stay deterministic", async () => {
  await client.query(`
    INSERT INTO staff_access_audit (
      actor_user_id, actor_name, actor_email,
      target_user_id, target_name, target_email,
      previous_role, new_role, created_at
    ) VALUES
      (1, 'Alice Owner', 'alice@example.com', 2, 'Chipo Banda', 'chipo@example.com', NULL, 'price_editor', '2026-09-10T09:00:00Z'),
      (1, 'Brian Owner', 'brian@example.com', 2, 'David Moyo', 'david@example.com', 'price_editor', 'ad_manager', '2026-09-11T09:00:00Z'),
      (1, 'Alice Owner', 'alice@example.com', 2, 'David Moyo', 'david@example.com', 'ad_manager', NULL, '2026-09-12T09:00:00Z'),
      (1, 'Alice Owner', 'alice@example.com', 2, 'Chipo Banda', 'chipo@example.com', NULL, 'owner', '2026-09-13T09:00:00Z'),
      (1, 'Brian Owner', 'brian@example.com', 2, 'Chipo Banda', 'chipo@example.com', 'owner', 'price_editor', '2026-09-14T09:00:00Z'),
      (1, 'Alice Owner', 'alice@example.com', 2, 'Chipo Banda', 'chipo@example.com', 'price_editor', 'owner', '2026-09-14T09:00:00Z')
  `);

  const firstPage = await auditHistory("?pageSize=2");
  assert.equal(firstPage.status, 200);
  assert.deepEqual(firstPage.body.entries?.map((entry) => entry.id), [6, 5]);
  assert.ok(firstPage.body.pagination?.nextCursor);

  const secondPage = await auditHistory(
    `?pageSize=2&cursor=${encodeURIComponent(firstPage.body.pagination!.nextCursor!)}`,
  );
  assert.equal(secondPage.status, 200);
  assert.deepEqual(secondPage.body.entries?.map((entry) => entry.id), [4, 3]);

  const combined = await auditHistory(
    "?actor=alice&target=chipo&role=owner&from=2026-09-13&to=2026-09-14",
  );
  assert.equal(combined.status, 200);
  assert.deepEqual(combined.body.entries?.map((entry) => entry.id), [6, 4]);

  const noAccess = await auditHistory("?role=none");
  assert.equal(noAccess.status, 200);
  assert.deepEqual(noAccess.body.entries?.map((entry) => entry.id), [4, 3, 1]);
});

test("staff audit history rejects invalid limits, cursors, roles, and calendar dates", async () => {
  const responses = await Promise.all([
    auditHistory("?pageSize=101"),
    auditHistory("?cursor=not-a-cursor"),
    auditHistory("?role=super_admin"),
    auditHistory("?from=2026-02-31"),
    auditHistory("?from=2026-09-15&to=2026-09-14"),
  ]);

  assert.deepEqual(responses.map((response) => response.status), [400, 400, 400, 400, 400]);
});