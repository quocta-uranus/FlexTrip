-- SRC-07: account wishlist. This migration only creates a new table and indexes.
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Wishlist_userId_listingId_key" ON "Wishlist"("userId", "listingId");
CREATE INDEX "Wishlist_userId_createdAt_id_idx" ON "Wishlist"("userId", "createdAt", "id");
CREATE INDEX "Wishlist_listingId_idx" ON "Wishlist"("listingId");

ALTER TABLE "Wishlist"
ADD CONSTRAINT "Wishlist_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Wishlist"
ADD CONSTRAINT "Wishlist_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
