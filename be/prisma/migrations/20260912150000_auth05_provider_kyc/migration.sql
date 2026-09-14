CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "KycDocumentType" AS ENUM ('NATIONAL_ID', 'PASSPORT', 'DRIVER_LICENSE');

CREATE TABLE "KycApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "documentType" "KycDocumentType" NOT NULL,
    "documentNumberEncrypted" TEXT NOT NULL,
    "documentNumberFingerprint" TEXT NOT NULL,
    "documentNumberLast4" TEXT NOT NULL,
    "documentFrontUrl" TEXT NOT NULL,
    "documentBackUrl" TEXT,
    "selfieUrl" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KycApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KycApplication_documentNumberFingerprint_key" ON "KycApplication"("documentNumberFingerprint");
CREATE INDEX "KycApplication_userId_status_idx" ON "KycApplication"("userId", "status");
CREATE INDEX "KycApplication_status_submittedAt_idx" ON "KycApplication"("status", "submittedAt");
CREATE INDEX "KycApplication_reviewedById_idx" ON "KycApplication"("reviewedById");

ALTER TABLE "KycApplication" ADD CONSTRAINT "KycApplication_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KycApplication" ADD CONSTRAINT "KycApplication_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
