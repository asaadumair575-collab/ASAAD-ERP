CREATE TABLE "RetailExportLog" (
  "id" SERIAL NOT NULL,
  "date" TEXT NOT NULL,
  "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RetailExportLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RetailExportLog_date_idx" ON "RetailExportLog"("date");
