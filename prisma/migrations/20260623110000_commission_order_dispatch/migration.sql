-- AlterTable
ALTER TABLE "CommissionOrder" ADD COLUMN "dispatched" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CommissionOrder" ADD COLUMN "dispatchedAt" TIMESTAMP(3);
