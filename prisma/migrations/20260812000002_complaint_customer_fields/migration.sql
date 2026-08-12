ALTER TABLE "Complaint" ADD COLUMN "complaintType" TEXT NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "Complaint" ADD COLUMN "customerName" TEXT;
ALTER TABLE "Complaint" ADD COLUMN "customerPhone" TEXT;
ALTER TABLE "Complaint" ADD COLUMN "orderId" TEXT;
CREATE INDEX "Complaint_complaintType_idx" ON "Complaint"("complaintType");
