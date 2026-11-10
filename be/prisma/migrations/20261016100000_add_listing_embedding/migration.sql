-- CreateTable
CREATE TABLE "ListingEmbedding" (
    "listingId" TEXT NOT NULL,
    "vector" DOUBLE PRECISION[],
    "contentHash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingEmbedding_pkey" PRIMARY KEY ("listingId")
);

-- AddForeignKey
ALTER TABLE "ListingEmbedding" ADD CONSTRAINT "ListingEmbedding_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

