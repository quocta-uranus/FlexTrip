-- ─── Phase 1: CAL + BOOK Foundation Migration ──────────────────────────────

-- 1. New enums
CREATE TYPE "DeliveryMethod" AS ENUM ('PICKUP', 'DELIVERY');
CREATE TYPE "CancelledBy" AS ENUM ('TRAVELER', 'PROVIDER', 'SYSTEM');
CREATE TYPE "ModifyRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- 2. Replace BookingStatus enum (PostgreSQL cannot drop enum values, must recreate)
-- First migrate any existing PENDING rows to PENDING_PAYMENT
UPDATE "Booking" SET "status" = 'PENDING'::"BookingStatus" WHERE "status" = 'PENDING'::"BookingStatus";

CREATE TYPE "BookingStatus_new" AS ENUM (
  'PENDING_PAYMENT',
  'PENDING_APPROVAL',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED',
  'REFUNDING',
  'REFUNDED'
);

ALTER TABLE "Booking"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "BookingStatus_new"
    USING CASE
      WHEN "status"::text = 'PENDING' THEN 'PENDING_PAYMENT'::"BookingStatus_new"
      ELSE "status"::text::"BookingStatus_new"
    END;

ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT'::"BookingStatus_new";

DROP TYPE "BookingStatus";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";

-- 3. Alter Listing — add CAL-02 + inventory fields
ALTER TABLE "Listing"
  ADD COLUMN "minRentalDays" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "maxRentalDays" INTEGER,
  ADD COLUMN "quantity"      INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "depositRate"   DECIMAL(3,2) NOT NULL DEFAULT 0.30;

-- 4. Alter Booking — add BOOK-01/03/07/08 fields
ALTER TABLE "Booking"
  ALTER COLUMN "startDate" TYPE DATE USING "startDate"::DATE,
  ALTER COLUMN "endDate"   TYPE DATE USING "endDate"::DATE,
  ADD COLUMN "quantity"          INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "depositAmount"     DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryMethod"    "DeliveryMethod" NOT NULL DEFAULT 'PICKUP',
  ADD COLUMN "deliveryAddress"   TEXT,
  ADD COLUMN "cancelledBy"       "CancelledBy",
  ADD COLUMN "cancellationReason" TEXT,
  ADD COLUMN "cancelledAt"       TIMESTAMP(3),
  ADD COLUMN "holdExpiresAt"     TIMESTAMP(3),
  ADD COLUMN "checkedInAt"       TIMESTAMP(3),
  ADD COLUMN "checkedOutAt"      TIMESTAMP(3);

-- Index for date range queries
CREATE INDEX "Booking_startDate_endDate_idx" ON "Booking"("startDate", "endDate");

-- 5. Create ListingAvailability
CREATE TABLE "ListingAvailability" (
  "id"        TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "date"      DATE NOT NULL,
  "isBlocked" BOOLEAN NOT NULL DEFAULT true,
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ListingAvailability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ListingAvailability_listingId_date_key"
  ON "ListingAvailability"("listingId", "date");
CREATE INDEX "ListingAvailability_listingId_idx"
  ON "ListingAvailability"("listingId");

ALTER TABLE "ListingAvailability"
  ADD CONSTRAINT "ListingAvailability_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE;

-- 6. Create Cart
CREATE TABLE "Cart" (
  "id"         TEXT NOT NULL,
  "travelerId" TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Cart_travelerId_key" ON "Cart"("travelerId");

ALTER TABLE "Cart"
  ADD CONSTRAINT "Cart_travelerId_fkey"
  FOREIGN KEY ("travelerId") REFERENCES "User"("id") ON DELETE CASCADE;

-- 7. Create CartItem
CREATE TABLE "CartItem" (
  "id"              TEXT NOT NULL,
  "cartId"          TEXT NOT NULL,
  "listingId"       TEXT NOT NULL,
  "startDate"       DATE NOT NULL,
  "endDate"         DATE NOT NULL,
  "quantity"        INTEGER NOT NULL DEFAULT 1,
  "deliveryMethod"  "DeliveryMethod" NOT NULL DEFAULT 'PICKUP',
  "deliveryAddress" TEXT,
  "unitPrice"       DECIMAL(10,2) NOT NULL,
  "holdExpiresAt"   TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CartItem_cartId_idx"       ON "CartItem"("cartId");
CREATE INDEX "CartItem_holdExpiresAt_idx" ON "CartItem"("holdExpiresAt");

ALTER TABLE "CartItem"
  ADD CONSTRAINT "CartItem_cartId_fkey"
  FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE;

ALTER TABLE "CartItem"
  ADD CONSTRAINT "CartItem_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id");

-- 8. Create BookingModifyRequest
CREATE TABLE "BookingModifyRequest" (
  "id"            TEXT NOT NULL,
  "bookingId"     TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "newStartDate"  DATE NOT NULL,
  "newEndDate"    DATE NOT NULL,
  "newQuantity"   INTEGER,
  "reason"        TEXT,
  "status"        "ModifyRequestStatus" NOT NULL DEFAULT 'PENDING',
  "respondedAt"   TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BookingModifyRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookingModifyRequest_bookingId_idx"
  ON "BookingModifyRequest"("bookingId");

ALTER TABLE "BookingModifyRequest"
  ADD CONSTRAINT "BookingModifyRequest_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE;

ALTER TABLE "BookingModifyRequest"
  ADD CONSTRAINT "BookingModifyRequest_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id");
