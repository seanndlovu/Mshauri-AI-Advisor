DROP INDEX IF EXISTS "staff_access_audit_created_at_idx";
DROP INDEX IF EXISTS "staff_access_audit_actor_user_id_idx";
DROP INDEX IF EXISTS "staff_access_audit_target_user_id_idx";

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "staff_access_audit_created_at_id_idx"
  ON "staff_access_audit" ("created_at" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "staff_access_audit_actor_name_trgm_idx"
  ON "staff_access_audit" USING gin ("actor_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "staff_access_audit_actor_email_trgm_idx"
  ON "staff_access_audit" USING gin ("actor_email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "staff_access_audit_target_name_trgm_idx"
  ON "staff_access_audit" USING gin ("target_name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "staff_access_audit_target_email_trgm_idx"
  ON "staff_access_audit" USING gin ("target_email" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "staff_access_audit_previous_role_idx"
  ON "staff_access_audit" ("previous_role");

CREATE INDEX IF NOT EXISTS "staff_access_audit_new_role_idx"
  ON "staff_access_audit" ("new_role");