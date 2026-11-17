-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "appealNote" TEXT,
ADD COLUMN     "appealedAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3);
