-- CreateEnum
CREATE TYPE "ReviewReportReason" AS ENUM ('FAKE_REVIEW', 'OFFENSIVE', 'SPAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewReportStatus" AS ENUM ('OPEN', 'UPHELD', 'DISMISSED');

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "responseEdits" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ReviewReport" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "ReviewReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReviewReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewReport_status_createdAt_idx" ON "ReviewReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewReport_reporterId_createdAt_idx" ON "ReviewReport"("reporterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewReport_reviewId_reporterId_key" ON "ReviewReport"("reviewId", "reporterId");

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
