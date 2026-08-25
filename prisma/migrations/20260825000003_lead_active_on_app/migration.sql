ALTER TABLE "ReorderLead" ADD COLUMN "activeOnApp" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "ReorderLead_activeOnApp_idx" ON "ReorderLead"("activeOnApp");
