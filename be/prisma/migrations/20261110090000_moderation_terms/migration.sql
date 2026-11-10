-- CreateEnum
CREATE TYPE "ModerationTermCategory" AS ENUM ('PROFANITY', 'INSULT', 'THREAT');

-- CreateTable
CREATE TABLE "ModerationTerm" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "category" "ModerationTermCategory" NOT NULL,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationTerm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModerationTerm_term_key" ON "ModerationTerm"("term");

-- CreateIndex
CREATE INDEX "ModerationTerm_disabled_idx" ON "ModerationTerm"("disabled");

