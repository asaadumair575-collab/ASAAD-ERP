CREATE TABLE "ReorderCallLog" (
  "id"         SERIAL PRIMARY KEY,
  "leadId"     INTEGER NOT NULL,
  "status"     TEXT NOT NULL,
  "callNote"   TEXT,
  "calledAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "calledById" INTEGER NOT NULL,
  CONSTRAINT "ReorderCallLog_leadId_fkey"     FOREIGN KEY ("leadId")     REFERENCES "ReorderLead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReorderCallLog_calledById_fkey" FOREIGN KEY ("calledById") REFERENCES "User"("id")         ON DELETE RESTRICT ON UPDATE CASCADE
);
