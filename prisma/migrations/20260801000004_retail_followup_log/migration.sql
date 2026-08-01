CREATE TABLE "RetailFollowupLog" (
  "id"         SERIAL PRIMARY KEY,
  "phone"      TEXT NOT NULL,
  "status"     TEXT NOT NULL,
  "note"       TEXT,
  "calledAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "calledById" INTEGER NOT NULL,
  CONSTRAINT "RetailFollowupLog_calledById_fkey" FOREIGN KEY ("calledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "RetailFollowupLog_phone_idx" ON "RetailFollowupLog"("phone");
