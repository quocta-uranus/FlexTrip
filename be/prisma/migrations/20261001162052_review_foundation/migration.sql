-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'UNKNOWN');

-- DropIndex
DROP INDEX "Review_listingId_idx";

-- DropIndex
DROP INDEX "Review_targetId_idx";

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedById" TEXT,
ADD COLUMN     "moderationNote" TEXT,
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "response" TEXT,
ADD COLUMN     "sentiment" "ReviewSentiment" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "spamScore" INTEGER,
ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "suspicionScore" INTEGER,
ADD COLUMN     "toxicityScore" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- Existing reviews predate the moderation workflow and remain public.
UPDATE "Review"
SET "status" = 'PUBLISHED', "sentiment" = 'UNKNOWN', "updatedAt" = "createdAt";

ALTER TABLE "Review"
ALTER COLUMN "updatedAt" SET NOT NULL,
ADD CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
ADD CONSTRAINT "Review_spamScore_check" CHECK ("spamScore" IS NULL OR "spamScore" BETWEEN 0 AND 100),
ADD CONSTRAINT "Review_toxicityScore_check" CHECK ("toxicityScore" IS NULL OR "toxicityScore" BETWEEN 0 AND 100),
ADD CONSTRAINT "Review_suspicionScore_check" CHECK ("suspicionScore" IS NULL OR "suspicionScore" BETWEEN 0 AND 100);

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_listingId_status_createdAt_idx" ON "Review"("listingId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Review_targetId_status_idx" ON "Review"("targetId", "status");

-- CreateIndex
CREATE INDEX "Review_authorId_createdAt_idx" ON "Review"("authorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
