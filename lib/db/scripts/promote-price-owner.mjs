import pg from "pg";

const email = process.argv[2]?.trim().toLowerCase();
const role = process.argv[3] ?? "owner";
if (!email) {
  console.error("Usage: node scripts/promote-price-owner.mjs user@example.com [owner|price_editor|ad_manager]");
  process.exit(1);
}
if (role !== "owner" && role !== "price_editor" && role !== "ad_manager") {
  console.error("Role must be owner, price_editor, or ad_manager.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  if (role === "owner") {
    const { rows: owners } = await client.query("SELECT id, email FROM users WHERE admin_role = 'owner' FOR UPDATE");
    if (owners.length && owners[0].email !== email) {
      throw new Error(`An owner is already assigned to ${owners[0].email}.`);
    }
  }
  const result = await client.query(
    "UPDATE users SET admin_role = $2, updated_at = NOW() WHERE email = $1 RETURNING id, email, admin_role",
    [email, role],
  );
  if (!result.rowCount) throw new Error("No registered user was found for that email.");
  await client.query("COMMIT");
  console.log(`Assigned ${result.rows[0].email} the ${result.rows[0].admin_role} staff role.`);
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await client.end();
}