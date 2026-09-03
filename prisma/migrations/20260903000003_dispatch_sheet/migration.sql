CREATE TABLE "DispatchSheet" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalParcels" INTEGER NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "totalWeight" DOUBLE PRECISION NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchSheet_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DispatchSheet_date_idx" ON "DispatchSheet"("date");

ALTER TABLE "DispatchSheet" ADD CONSTRAINT "DispatchSheet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
