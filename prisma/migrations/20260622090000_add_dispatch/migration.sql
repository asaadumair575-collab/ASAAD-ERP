-- AlterTable
ALTER TABLE "Order" ADD COLUMN "dispatched" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "dispatchedAt" TIMESTAMP(3);
