-- Clerk manages credentials for new Google and email users. Existing hashes
-- remain populated and usable through the temporary legacy sign-in route.
ALTER TABLE "users"
  ALTER COLUMN "password_hash" DROP NOT NULL;