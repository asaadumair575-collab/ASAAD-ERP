-- Drop customerType from Client (added in previous migration)
ALTER TABLE "Client" DROP COLUMN IF EXISTS "customerType";

-- CreateTable RetailCustomer
CREATE TABLE "RetailCustomer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RetailCustomer_pkey" PRIMARY KEY ("id")
);

-- Add retailCustomerId to RetailOrder
ALTER TABLE "RetailOrder" ADD COLUMN "retailCustomerId" INTEGER;

-- AddForeignKey
ALTER TABLE "RetailOrder" ADD CONSTRAINT "RetailOrder_retailCustomerId_fkey" FOREIGN KEY ("retailCustomerId") REFERENCES "RetailCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
