-- AlterTable: add customerType to Client
ALTER TABLE "Client" ADD COLUMN "customerType" TEXT NOT NULL DEFAULT 'RETAIL';

-- AlterTable: add orderType and deliveryCharge to Order
ALTER TABLE "Order" ADD COLUMN "orderType" TEXT NOT NULL DEFAULT 'CREDIT';
ALTER TABLE "Order" ADD COLUMN "deliveryCharge" DOUBLE PRECISION;
