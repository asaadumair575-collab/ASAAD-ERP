ALTER TABLE "BusinessProfile"
  ADD COLUMN "bankName"          TEXT,
  ADD COLUMN "bankAccountTitle"  TEXT,
  ADD COLUMN "bankAccountNumber" TEXT;

CREATE TABLE "DraftOrder" (
  "id"            SERIAL PRIMARY KEY,
  "customerName"  TEXT NOT NULL,
  "phone"         TEXT,
  "address"       TEXT,
  "city"          TEXT,
  "items"         TEXT,
  "advanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 200,
  "confirmed"     BOOLEAN NOT NULL DEFAULT false,
  "confirmedAt"   TIMESTAMP(3),
  "createdById"   INTEGER,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DraftOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "DraftOrder_createdById_idx" ON "DraftOrder"("createdById");
CREATE INDEX "DraftOrder_confirmed_idx" ON "DraftOrder"("confirmed");
