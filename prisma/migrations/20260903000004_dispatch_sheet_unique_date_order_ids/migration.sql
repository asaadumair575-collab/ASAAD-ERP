DROP INDEX IF EXISTS "DispatchSheet_date_idx";

ALTER TABLE "DispatchSheet" ADD COLUMN "orderIds" INTEGER[] NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX "DispatchSheet_date_key" ON "DispatchSheet"("date");
