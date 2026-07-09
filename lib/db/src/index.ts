import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Without this listener, an error on an idle pooled client (e.g. a dropped
// connection) becomes an uncaught exception that crashes the whole process.
// See: https://node-postgres.com/apis/pool#error
pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Unexpected error on idle PostgreSQL client", err);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
