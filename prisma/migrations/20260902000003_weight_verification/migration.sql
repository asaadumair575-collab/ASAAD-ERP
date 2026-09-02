CREATE TABLE "WeightVerification" (
    "id" SERIAL NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "verifiedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightVerification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WeightVerification_trackingNumber_idx" ON "WeightVerification"("trackingNumber");
CREATE INDEX "WeightVerification_createdAt_idx" ON "WeightVerification"("createdAt");

ALTER TABLE "WeightVerification" ADD CONSTRAINT "WeightVerification_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
