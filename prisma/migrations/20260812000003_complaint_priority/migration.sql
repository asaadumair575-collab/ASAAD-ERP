ALTER TABLE "Complaint" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
CREATE INDEX "Complaint_priority_idx" ON "Complaint"("priority");
