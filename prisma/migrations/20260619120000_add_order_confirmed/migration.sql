-- AlterTable
ALTER TABLE "Order" ADD COLUMN "confirmed" BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing orders as confirmed so historical ledger data is unaffected
UPDATE "Order" SET "confirmed" = true;
