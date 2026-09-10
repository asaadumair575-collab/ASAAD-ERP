-- Tracks when an order last moved stage, so the new Retail COD pipeline
-- can show "how long has this been sitting here" (aging/SLA) per order.
ALTER TABLE "EcomOrder" ADD COLUMN "stageUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
