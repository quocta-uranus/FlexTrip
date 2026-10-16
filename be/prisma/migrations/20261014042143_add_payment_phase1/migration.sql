-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('WALLET', 'VNPAY', 'MOMO');

-- CreateEnum
CREATE TYPE "WalletTxType" AS ENUM ('CREDIT', 'DEBIT', 'FREEZE', 'UNFREEZE', 'TOPUP', 'PAYOUT', 'REFUND', 'COMMISSION_SPLIT');

-- CreateEnum
CREATE TYPE "WalletTxStatus" AS ENUM ('PENDING', 'SETTLED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "LedgerStatus" AS ENUM ('PENDING', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('CANCELLATION', 'DISPUTE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "TopupStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- DropIndex
DROP INDEX "Payment_transactionId_key";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "amount",
DROP COLUMN "method",
DROP COLUMN "transactionId",
ADD COLUMN     "depositAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gateway" "PaymentGateway" NOT NULL DEFAULT 'WALLET',
ADD COLUMN     "gatewayOrderCode" TEXT,
ADD COLUMN     "gatewayTransId" TEXT,
ADD COLUMN     "providerNet" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "rentalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "staffFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "cancellationStrikes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "strikeResetAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "wallet_transactions" ADD COLUMN     "balanceAfter" DECIMAL(14,2),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "status" "WalletTxStatus" NOT NULL DEFAULT 'SETTLED',
DROP COLUMN "type",
ADD COLUMN     "type" "WalletTxType" NOT NULL;

-- AlterTable
ALTER TABLE "wallets" DROP COLUMN "balance",
ADD COLUMN     "availableBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "frozenBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "pendingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CommissionLedger" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "platformFee" DECIMAL(10,2) NOT NULL,
    "staffFee" DECIMAL(10,2) NOT NULL,
    "providerNet" DECIMAL(10,2) NOT NULL,
    "staffUserId" TEXT,
    "status" "LedgerStatus" NOT NULL DEFAULT 'PENDING',
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundRecord" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" "RefundReason" NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookLog" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "gateway" "PaymentGateway" NOT NULL,
    "payload" JSONB NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopupRecord" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "TopupStatus" NOT NULL DEFAULT 'PENDING',
    "gateway" "PaymentGateway" NOT NULL,
    "gatewayOrderCode" TEXT,
    "gatewayTransId" TEXT,
    "gatewayResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopupRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommissionLedger_paymentId_key" ON "CommissionLedger"("paymentId");

-- CreateIndex
CREATE INDEX "CommissionLedger_bookingId_idx" ON "CommissionLedger"("bookingId");

-- CreateIndex
CREATE INDEX "RefundRecord_paymentId_idx" ON "RefundRecord"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_gateway_createdAt_idx" ON "PaymentWebhookLog"("gateway", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TopupRecord_gatewayTransId_key" ON "TopupRecord"("gatewayTransId");

-- CreateIndex
CREATE INDEX "TopupRecord_walletId_idx" ON "TopupRecord"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gatewayTransId_key" ON "Payment"("gatewayTransId");

-- CreateIndex
CREATE INDEX "Payment_gateway_idx" ON "Payment"("gateway");

-- CreateIndex
CREATE INDEX "wallet_transactions_refType_refId_idx" ON "wallet_transactions"("refType", "refId");

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRecord" ADD CONSTRAINT "RefundRecord_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookLog" ADD CONSTRAINT "PaymentWebhookLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopupRecord" ADD CONSTRAINT "TopupRecord_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("walletId") ON DELETE RESTRICT ON UPDATE CASCADE;
