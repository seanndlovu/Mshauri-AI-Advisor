-- Clerk manages credentials for Google and email users. The nullable column
-- remains only for historical compatibility; deployment clears legacy hashes.
ALTER TABLE "users"
  ALTER COLUMN "password_hash" DROP NOT NULL;