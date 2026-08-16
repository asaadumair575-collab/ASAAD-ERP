-- Add code column to Client
ALTER TABLE "Client" ADD COLUMN "code" TEXT;

-- Backfill Client codes: e.g. LHR-W001
UPDATE "Client" c
SET "code" = sub.new_code
FROM (
  SELECT
    id,
    UPPER(LEFT(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(city), ''), 'XXX'), '[^a-zA-Z]', '', 'g'), 3)) || '-W' ||
    LPAD(ROW_NUMBER() OVER (
      PARTITION BY UPPER(LEFT(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(city), ''), 'XXX'), '[^a-zA-Z]', '', 'g'), 3))
      ORDER BY id
    )::TEXT, 3, '0') AS new_code
  FROM "Client"
) sub
WHERE c.id = sub.id;

-- Make code unique and not null
ALTER TABLE "Client" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "Client_code_key" ON "Client"("code");

-- Add code column to RetailCustomer
ALTER TABLE "RetailCustomer" ADD COLUMN "code" TEXT;

-- Backfill RetailCustomer codes: e.g. LHR-R001
UPDATE "RetailCustomer" rc
SET "code" = sub.new_code
FROM (
  SELECT
    id,
    UPPER(LEFT(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(city), ''), 'XXX'), '[^a-zA-Z]', '', 'g'), 3)) || '-R' ||
    LPAD(ROW_NUMBER() OVER (
      PARTITION BY UPPER(LEFT(REGEXP_REPLACE(COALESCE(NULLIF(TRIM(city), ''), 'XXX'), '[^a-zA-Z]', '', 'g'), 3))
      ORDER BY id
    )::TEXT, 3, '0') AS new_code
  FROM "RetailCustomer"
) sub
WHERE rc.id = sub.id;

-- Make code unique and not null
ALTER TABLE "RetailCustomer" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "RetailCustomer_code_key" ON "RetailCustomer"("code");
