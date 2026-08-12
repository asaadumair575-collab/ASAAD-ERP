CREATE TABLE IF NOT EXISTS "Complaint" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "adminNote" TEXT,
  "submittedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Complaint_submittedById_idx" ON "Complaint"("submittedById");
CREATE INDEX IF NOT EXISTS "Complaint_status_idx" ON "Complaint"("status");

ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_submittedById_fkey"
  FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
