-- CreateEnum
CREATE TYPE "StaffMediationStatus" AS ENUM ('OPEN', 'RESOLVED', 'ESCALATED');

-- DropForeignKey
ALTER TABLE "BookingModifyRequest" DROP CONSTRAINT "BookingModifyRequest_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "BookingModifyRequest" DROP CONSTRAINT "BookingModifyRequest_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_travelerId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_listingId_fkey";

-- DropForeignKey
ALTER TABLE "ListingAvailability" DROP CONSTRAINT "ListingAvailability_listingId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "handoverCondition" TEXT,
ADD COLUMN     "returnCondition" TEXT;

-- CreateTable
CREATE TABLE "StaffMediation" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "status" "StaffMediationStatus" NOT NULL DEFAULT 'OPEN',
    "issue" TEXT NOT NULL,
    "travelerStatement" TEXT,
    "providerStatement" TEXT,
    "resolution" TEXT,
    "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "escalatedDisputeId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMediation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffMediation_escalatedDisputeId_key" ON "StaffMediation"("escalatedDisputeId");

-- CreateIndex
CREATE INDEX "StaffMediation_staffId_status_createdAt_idx" ON "StaffMediation"("staffId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "StaffMediation_bookingId_createdAt_idx" ON "StaffMediation"("bookingId", "createdAt");

-- AddForeignKey
ALTER TABLE "ListingAvailability" ADD CONSTRAINT "ListingAvailability_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingModifyRequest" ADD CONSTRAINT "BookingModifyRequest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingModifyRequest" ADD CONSTRAINT "BookingModifyRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMediation" ADD CONSTRAINT "StaffMediation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMediation" ADD CONSTRAINT "StaffMediation_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMediation" ADD CONSTRAINT "StaffMediation_escalatedDisputeId_fkey" FOREIGN KEY ("escalatedDisputeId") REFERENCES "Dispute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
