---
name: VPS PostgreSQL retry safety
description: How self-hosted Mshauri deployments stay safe to rerun after a partial database setup.
---

The first-deploy and update paths must reconcile the application PostgreSQL role, database owner, and `public` schema privileges before applying the Drizzle schema. They must also verify that the application credentials can log in before starting the schema operation.

**Why:** A previous or partial deploy can leave the role with an old password or the database/schema owned by another role. Skipping creation when those resources already exist does not correct that state, and Drizzle then reports only a generic schema-push failure.

**How to apply:** Keep deployment setup idempotent. On every run, set the configured role password, set the configured database owner, grant the role required schema privileges, and perform a non-interactive connection check using the generated application connection URL before running Drizzle.