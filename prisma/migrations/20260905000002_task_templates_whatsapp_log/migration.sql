-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" SERIAL NOT NULL,
    "assignedToId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "metric" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappReplyLog" (
    "id" SERIAL NOT NULL,
    "repliedById" INTEGER NOT NULL,
    "note" TEXT,
    "repliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappReplyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskTemplate_assignedToId_idx" ON "TaskTemplate"("assignedToId");

-- CreateIndex
CREATE INDEX "WhatsappReplyLog_repliedById_idx" ON "WhatsappReplyLog"("repliedById");

-- CreateIndex
CREATE INDEX "WhatsappReplyLog_repliedAt_idx" ON "WhatsappReplyLog"("repliedAt");

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappReplyLog" ADD CONSTRAINT "WhatsappReplyLog_repliedById_fkey" FOREIGN KEY ("repliedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
