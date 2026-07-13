ALTER TABLE "RetailOrder" ADD COLUMN "dispatched" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RetailOrder" ADD COLUMN "dispatchedAt" TIMESTAMP(3);
