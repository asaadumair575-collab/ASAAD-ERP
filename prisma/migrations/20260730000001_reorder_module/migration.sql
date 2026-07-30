CREATE TABLE "ReorderCampaign" (
  "id"          SERIAL PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" INTEGER REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE TABLE "ReorderLead" (
  "id"           SERIAL PRIMARY KEY,
  "campaignId"   INTEGER NOT NULL REFERENCES "ReorderCampaign"("id") ON DELETE CASCADE,
  "customerName" TEXT NOT NULL,
  "phone"        TEXT NOT NULL,
  "city"         TEXT,
  "prevItem"     TEXT,
  "status"       TEXT NOT NULL DEFAULT 'PENDING',
  "callNote"     TEXT,
  "calledAt"     TIMESTAMP(3),
  "calledById"   INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
