ALTER TABLE "DispatchSheet" ADD COLUMN "finalWeight" DOUBLE PRECISION;
ALTER TABLE "DispatchSheet" ADD COLUMN "dispatchedAt" TIMESTAMP(3);
ALTER TABLE "DispatchSheet" ADD COLUMN "dispatchedById" INTEGER;

ALTER TABLE "DispatchSheet" ADD CONSTRAINT "DispatchSheet_dispatchedById_fkey" FOREIGN KEY ("dispatchedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
