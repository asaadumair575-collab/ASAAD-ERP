CREATE TABLE "EmpWithdrawal" (
  "id"        SERIAL PRIMARY KEY,
  "userId"    INTEGER NOT NULL REFERENCES "User"("id"),
  "amount"    DOUBLE PRECISION NOT NULL,
  "note"      TEXT,
  "date"      DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "EmpWithdrawal_userId_idx" ON "EmpWithdrawal"("userId");
