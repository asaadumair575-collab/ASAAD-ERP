DROP INDEX IF EXISTS "DispatchSheet_date_key";

CREATE INDEX IF NOT EXISTS "DispatchSheet_date_idx" ON "DispatchSheet"("date");
