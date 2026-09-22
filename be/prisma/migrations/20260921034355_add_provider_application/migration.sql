-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ProviderApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "categories" TEXT[],
    "description" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSetupToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderSetupToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderApplication_status_idx" ON "ProviderApplication"("status");

-- CreateIndex
CREATE INDEX "ProviderApplication_email_idx" ON "ProviderApplication"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSetupToken_userId_key" ON "ProviderSetupToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSetupToken_tokenHash_key" ON "ProviderSetupToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "ProviderSetupToken" ADD CONSTRAINT "ProviderSetupToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
