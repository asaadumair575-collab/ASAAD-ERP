ALTER TABLE "ReorderCampaign" ADD COLUMN "auditFeedback" TEXT;
ALTER TABLE "ReorderCampaign" ADD COLUMN "auditReturnedAt" TIMESTAMP(3);

CREATE TABLE "CampaignAuditLog" (
  "id"         SERIAL PRIMARY KEY,
  "campaignId" INTEGER NOT NULL,
  "sentAt"     TIMESTAMP(3) NOT NULL,
  "returnedAt" TIMESTAMP(3),
  "feedback"   TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "CampaignAuditLog_campaignId_idx" ON "CampaignAuditLog"("campaignId");

ALTER TABLE "CampaignAuditLog"
  ADD CONSTRAINT "CampaignAuditLog_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "ReorderCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
