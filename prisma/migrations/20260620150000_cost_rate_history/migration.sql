-- CreateTable
CREATE TABLE "CostRate" (
    "id" SERIAL NOT NULL,
    "costPerDozen" DOUBLE PRECISION NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostRate_pkey" PRIMARY KEY ("id")
);

-- Seed initial rate from existing BusinessProfile.costPerDozen so existing orders keep using it
INSERT INTO "CostRate" ("costPerDozen", "effectiveFrom", "createdAt")
SELECT "costPerDozen", '1970-01-01 00:00:00'::timestamp, CURRENT_TIMESTAMP
FROM "BusinessProfile"
LIMIT 1;

INSERT INTO "CostRate" ("costPerDozen", "effectiveFrom", "createdAt")
SELECT 1550, '1970-01-01 00:00:00'::timestamp, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "CostRate");

-- AlterTable
ALTER TABLE "BusinessProfile" DROP COLUMN "costPerDozen";
