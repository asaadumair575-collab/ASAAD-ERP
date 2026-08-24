CREATE TABLE "EcomOrderStatusLog" (
  "id"        SERIAL PRIMARY KEY,
  "orderId"   INTEGER NOT NULL REFERENCES "EcomOrder"("id") ON DELETE CASCADE,
  "status"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "EcomOrderStatusLog_orderId_idx" ON "EcomOrderStatusLog"("orderId");
