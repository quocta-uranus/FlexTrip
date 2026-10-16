-- AlterEnum
-- Remove VNPAY and MOMO variants, add PAYOS
ALTER TYPE "PaymentGateway" RENAME TO "PaymentGateway_old";
CREATE TYPE "PaymentGateway" AS ENUM ('WALLET', 'PAYOS');
ALTER TABLE "Payment" ALTER COLUMN "gateway" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "gateway" TYPE "PaymentGateway" USING ("gateway"::text::"PaymentGateway");
ALTER TABLE "TopupRecord" ALTER COLUMN "gateway" TYPE "PaymentGateway" USING ("gateway"::text::"PaymentGateway");
ALTER TABLE "PaymentWebhookLog" ALTER COLUMN "gateway" TYPE "PaymentGateway" USING ("gateway"::text::"PaymentGateway");
ALTER TABLE "Payment" ALTER COLUMN "gateway" SET DEFAULT 'WALLET';
DROP TYPE "PaymentGateway_old";
