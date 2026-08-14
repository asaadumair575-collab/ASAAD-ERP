ALTER TABLE "User" ADD COLUMN "apiToken" TEXT UNIQUE;

CREATE TABLE "PhoneCallLog" (
  "id"          SERIAL PRIMARY KEY,
  "userId"      INTEGER NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "contactName" TEXT,
  "duration"    INTEGER NOT NULL,
  "callType"    TEXT NOT NULL,
  "calledAt"    TIMESTAMP(3) NOT NULL,
  "synced"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneCallLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PhoneCallLog_userId_phoneNumber_calledAt_key" UNIQUE ("userId", "phoneNumber", "calledAt")
);
CREATE INDEX "PhoneCallLog_userId_idx" ON "PhoneCallLog"("userId");
CREATE INDEX "PhoneCallLog_userId_calledAt_idx" ON "PhoneCallLog"("userId", "calledAt");
