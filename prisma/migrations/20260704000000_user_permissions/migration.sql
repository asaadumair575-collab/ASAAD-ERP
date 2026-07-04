ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" JSONB NOT NULL DEFAULT '{}';

-- First user created is admin by default
UPDATE "User" SET "isAdmin" = true WHERE id = (SELECT id FROM "User" ORDER BY id ASC LIMIT 1);
