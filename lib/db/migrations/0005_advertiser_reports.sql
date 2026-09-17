CREATE TABLE IF NOT EXISTS "advertiser_reports" (
  "id" serial PRIMARY KEY NOT NULL,
  "token_hash" text NOT NULL,
  "ad_id" integer NOT NULL,
  "payload" jsonb NOT NULL,
  "created_by" integer NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "advertiser_reports_token_hash_idx"
  ON "advertiser_reports" ("token_hash");
CREATE INDEX IF NOT EXISTS "advertiser_reports_expires_at_idx"
  ON "advertiser_reports" ("expires_at");