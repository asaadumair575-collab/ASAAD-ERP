CREATE TABLE "WebsiteVisit" (
    "id" SERIAL NOT NULL,
    "visitorId" TEXT NOT NULL,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebsiteVisit_createdAt_idx" ON "WebsiteVisit"("createdAt");
CREATE INDEX "WebsiteVisit_visitorId_idx" ON "WebsiteVisit"("visitorId");
