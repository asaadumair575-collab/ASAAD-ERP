ALTER TABLE "ReorderCampaign" ADD COLUMN "sentForAudit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ReorderCampaign" ADD COLUMN "auditRequestedAt" TIMESTAMP(3);
