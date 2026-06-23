-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "shopNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- AlterTable: clientId becomes optional, add leadId
ALTER TABLE "Sample" ALTER COLUMN "clientId" DROP NOT NULL;
ALTER TABLE "Sample" ADD COLUMN "leadId" INTEGER;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
