-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Seed initial user (username: asaad, password: asaad12)
INSERT INTO "User" ("username", "passwordHash") VALUES
('asaad', '3735bcb2331c506e0038f59b3f43e91f:0d32d97b6b00f9c7713998d6cae04af786af43501ab060c4de96aa77d1a85e94867237d45da2b9883b52bfa351aa890516da06df85e6b51f53e03abce12e325f');
