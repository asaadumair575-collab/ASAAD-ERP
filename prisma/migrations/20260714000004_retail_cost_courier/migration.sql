-- Add courierCharge to RetailOrder (Postex deduction tracked per order)
ALTER TABLE "RetailOrder" ADD COLUMN "courierCharge" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Add costPrice to RetailOrderItem (purchase cost per unit for profit calc)
ALTER TABLE "RetailOrderItem" ADD COLUMN "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
