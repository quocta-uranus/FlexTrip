/*
  Warnings:

  - A unique constraint covering the columns `[referralCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('REGISTERED', 'QUALIFIED', 'REWARDED', 'REJECTED');

-- AlterTable
ALTER TABLE "CommissionLedger" ADD COLUMN     "incentiveDiscountPct" DECIMAL(5,2),
ADD COLUMN     "platformRate" DECIMAL(5,4);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referralCode" TEXT;

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'REGISTERED',
    "rejectReason" TEXT,
    "refereeVoucherId" TEXT,
    "referrerVoucherId" TEXT,
    "qualifiedBookingId" TEXT,
    "rewardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderIncentive" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "isTopRated" BOOLEAN NOT NULL DEFAULT false,
    "score" DECIMAL(5,2) NOT NULL,
    "feeDiscountPct" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "reasons" JSONB NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderIncentive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referral_refereeId_key" ON "Referral"("refereeId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_status_idx" ON "Referral"("referrerId", "status");

-- CreateIndex
CREATE INDEX "Referral_status_createdAt_idx" ON "Referral"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderIncentive_providerId_key" ON "ProviderIncentive"("providerId");

-- CreateIndex
CREATE INDEX "ProviderIncentive_isTopRated_validUntil_idx" ON "ProviderIncentive"("isTopRated", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderIncentive" ADD CONSTRAINT "ProviderIncentive_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
