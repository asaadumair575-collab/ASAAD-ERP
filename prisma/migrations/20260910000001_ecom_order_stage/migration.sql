-- Drives the new "Retail COD (New)" pipeline view — a parallel status
-- track independent of the existing draft/confirmed/dispatched fields.
ALTER TABLE "EcomOrder" ADD COLUMN "stage" TEXT NOT NULL DEFAULT 'PENDING';

CREATE INDEX "EcomOrder_stage_idx" ON "EcomOrder"("stage");
