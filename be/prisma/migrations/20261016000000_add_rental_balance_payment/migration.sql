-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "balanceDueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "rentalGateway" "PaymentGateway",
ADD COLUMN     "rentalOrderCode" TEXT,
ADD COLUMN     "rentalPaidAt" TIMESTAMP(3),
ADD COLUMN     "rentalTransId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_rentalTransId_key" ON "Payment"("rentalTransId");


-- Các payment đã thu full từ trước coi như đã trả cả phần tiền thuê
UPDATE "Payment" SET "rentalPaidAt" = "createdAt", "rentalGateway" = "gateway"
WHERE "status" IN ('PAID', 'REFUNDED');
