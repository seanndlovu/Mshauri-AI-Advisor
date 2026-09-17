ALTER TABLE "ads"
  ADD COLUMN IF NOT EXISTS "billing_model" text NOT NULL DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS "rate_cents" integer,
  ADD COLUMN IF NOT EXISTS "budget_cents" integer;

CREATE TABLE IF NOT EXISTS "ad_analytics_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "ad_id" integer NOT NULL REFERENCES "ads"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "placement" text NOT NULL,
  "page_path" text NOT NULL,
  "visitor_token" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ad_analytics_events_ad_created_at_idx"
  ON "ad_analytics_events" ("ad_id", "created_at");
CREATE INDEX IF NOT EXISTS "ad_analytics_events_event_created_at_idx"
  ON "ad_analytics_events" ("event_type", "created_at");
CREATE INDEX IF NOT EXISTS "ad_analytics_events_visitor_token_idx"
  ON "ad_analytics_events" ("visitor_token");