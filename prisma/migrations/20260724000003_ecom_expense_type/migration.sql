ALTER TABLE "EcomExpense" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'VARIABLE';
UPDATE "EcomExpense" SET "type" = 'FIXED' WHERE "category" IN ('Shopify', 'Agency Commission');
