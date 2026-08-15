CREATE TABLE "ClientProductRate" (
  "id"        SERIAL PRIMARY KEY,
  "clientId"  INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "rate"      DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientProductRate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClientProductRate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClientProductRate_clientId_productId_key" UNIQUE ("clientId", "productId")
);
CREATE INDEX "ClientProductRate_clientId_idx" ON "ClientProductRate"("clientId");
