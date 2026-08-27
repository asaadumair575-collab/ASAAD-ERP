ALTER TABLE "Lead" ADD COLUMN "contactedById" INTEGER;
ALTER TABLE "Lead" ADD COLUMN "contactedAt" TIMESTAMP(3);
CREATE INDEX "Lead_contactedById_contactedAt_idx" ON "Lead"("contactedById", "contactedAt");
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactedById_fkey" FOREIGN KEY ("contactedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
