CREATE TABLE IF NOT EXISTS "staff_access_audit" (
  "id" serial PRIMARY KEY NOT NULL,
  "actor_user_id" integer NOT NULL REFERENCES "users"("id"),
  "actor_name" text NOT NULL,
  "actor_email" text NOT NULL,
  "target_user_id" integer NOT NULL REFERENCES "users"("id"),
  "target_name" text NOT NULL,
  "target_email" text NOT NULL,
  "previous_role" text,
  "new_role" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "staff_access_audit_previous_role_check"
    CHECK ("previous_role" IS NULL OR "previous_role" IN ('owner', 'price_editor', 'ad_manager')),
  CONSTRAINT "staff_access_audit_new_role_check"
    CHECK ("new_role" IS NULL OR "new_role" IN ('owner', 'price_editor', 'ad_manager'))
);

CREATE INDEX IF NOT EXISTS "staff_access_audit_created_at_idx"
  ON "staff_access_audit" ("created_at" DESC);