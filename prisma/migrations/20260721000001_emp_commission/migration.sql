CREATE TABLE "EmpCommissionEntry" (
  "id"           SERIAL PRIMARY KEY,
  "userId"       INTEGER NOT NULL,
  "date"         DATE NOT NULL,
  "orders"       INTEGER NOT NULL,
  "ratePerOrder" DOUBLE PRECISION NOT NULL DEFAULT 30,
  "note"         TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmpCommissionEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
