DROP INDEX IF EXISTS "DispatchSheet_date_idx";

ALTER TABLE "DispatchSheet" ADD COLUMN IF NOT EXISTS "orderIds" INTEGER[] NOT NULL DEFAULT '{}';

-- Before this constraint existed, generating the same date's list twice was
-- possible — collapse any such duplicates down to the earliest row so the
-- unique index below can actually be created.
DELETE FROM "DispatchSheet" a
USING "DispatchSheet" b
WHERE a."date" = b."date" AND a."id" > b."id";

CREATE UNIQUE INDEX IF NOT EXISTS "DispatchSheet_date_key" ON "DispatchSheet"("date");
