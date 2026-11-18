/*
  Warnings:

  - A unique constraint covering the columns `[contractNo]` on the table `Contract` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "content" JSONB,
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "contractNo" TEXT,
ADD COLUMN     "providerSignature" JSONB,
ADD COLUMN     "templateVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "travelerSignature" JSONB;

-- CreateTable
CREATE TABLE "ContractCounter" (
    "year" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContractCounter_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNo_key" ON "Contract"("contractNo");
