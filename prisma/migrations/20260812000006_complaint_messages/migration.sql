CREATE TABLE "ComplaintMessage" (
  "id"          SERIAL PRIMARY KEY,
  "complaintId" INTEGER NOT NULL REFERENCES "Complaint"("id") ON DELETE CASCADE,
  "userId"      INTEGER NOT NULL REFERENCES "User"("id"),
  "message"     TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ComplaintMessage_complaintId_idx" ON "ComplaintMessage"("complaintId");
