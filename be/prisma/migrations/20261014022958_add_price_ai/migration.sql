-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('MANUAL', 'AI_SUGGESTED', 'AI_AUTO');

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "source" "PriceSource" NOT NULL,
    "aiScore" DOUBLE PRECISION,
    "aiReason" TEXT,
    "bookingRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPriceConfig" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "autoAdjust" BOOLEAN NOT NULL DEFAULT false,
    "minPrice" DECIMAL(10,2),
    "maxPrice" DECIMAL(10,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingPriceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceHistory_listingId_createdAt_idx" ON "PriceHistory"("listingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListingPriceConfig_listingId_key" ON "ListingPriceConfig"("listingId");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPriceConfig" ADD CONSTRAINT "ListingPriceConfig_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
