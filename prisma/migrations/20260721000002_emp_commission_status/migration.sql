ALTER TABLE "EmpCommissionEntry" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "EmpCommissionEntry" DROP COLUMN IF EXISTS "ratePerOrder";
