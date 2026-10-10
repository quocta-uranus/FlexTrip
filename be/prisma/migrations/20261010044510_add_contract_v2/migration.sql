/*
  Warnings:

  - You are about to drop the column `checkInPhoto` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `checkOutPhoto` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `signedAt` on the `Contract` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ContractStatus" ADD VALUE 'TRAVELER_SIGNED';

-- AlterTable
ALTER TABLE "Contract" DROP COLUMN "checkInPhoto",
DROP COLUMN "checkOutPhoto",
DROP COLUMN "signedAt",
ADD COLUMN     "checkInPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "checkOutPhotos" JSONB,
ADD COLUMN     "idDocumentType" TEXT,
ADD COLUMN     "idDocumentUrl" TEXT,
ADD COLUMN     "insuranceOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "insuranceRef" TEXT,
ADD COLUMN     "penaltyRules" JSONB,
ADD COLUMN     "productConditionNote" TEXT,
ADD COLUMN     "providerSignedAt" TIMESTAMP(3),
ADD COLUMN     "templateType" TEXT NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "travelerSignedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "conditionNote" TEXT,
ADD COLUMN     "isHighValue" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketValue" DECIMAL(12,2),
ADD COLUMN     "penaltyRules" JSONB;
