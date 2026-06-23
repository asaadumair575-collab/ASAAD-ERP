-- CreateTable
CREATE TABLE "CommissionRate" (
    "id" SERIAL NOT NULL,
    "ratePerDozen" DOUBLE PRECISION NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionOrder" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dozens" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionOrder_pkey" PRIMARY KEY ("id")
);
