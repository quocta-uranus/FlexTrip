# FlexTrip — CAL + BOOK Implementation Plan

> **Scope:** CAL-01..04 (Quản lý lịch trống) + BOOK-01..09 (Đặt chỗ & Cho thuê)  
> **Ngày lập:** 2026-09-29

---

## Tổng quan Use Cases

| ID | Tên | Actor | Deferred? |
|----|-----|-------|-----------|
| CAL-01 | Manage Availability Calendar | Provider | |
| CAL-02 | Set Min/Max Rental Period | Provider | |
| CAL-03 | Sync External Calendar (Google/iCal) | Provider | 🔒 |
| CAL-04 | AI Auto-block Conflict Detection | Provider | 🔒 |
| BOOK-01 | Book & Pay | Traveler | |
| BOOK-02 | Multi-item / Bundle Booking (Cart) | Traveler | |
| BOOK-03 | Temporary Hold (15 min) | Traveler | |
| BOOK-04 | Approve / Decline Booking | Provider | |
| BOOK-05 | Modify Booking | Both | |
| BOOK-06 | Track Booking Status | Both | |
| BOOK-07 | Cancel Booking | Both | |
| BOOK-08 | QR Code Check-in/Return | Both | 🔒 |
| BOOK-09 | AI Damage Assessment | Both | 🔒 |

---

## State Machine — Booking

```
PENDING_PAYMENT
    │  Traveler pays
    ▼
PENDING_APPROVAL ──► Provider decline ──► CANCELLED + refund 100%
    │
    │  Provider approves
    ▼
CONFIRMED ──► Traveler cancel (≥3d trước) ──► CANCELLED + refund 100%
    │     └─► Traveler cancel (<3d trước)  ──► CANCELLED + mất deposit
    │     └─► Provider cancel (bất kỳ lúc) ──► CANCELLED + refund 100%
    │
    │  BullMQ job: startDate reached
    ▼
IN_PROGRESS ──► Dispute opened ──► DISPUTED (listing bị lock)
    │
    │  QR / manual confirm
    ▼
COMPLETED
```

## Cancellation Policy

| Trạng thái | Ai huỷ | Kết quả |
|-----------|--------|---------|
| `PENDING_PAYMENT` | Traveler | Xoá booking, không hoàn (chưa thu) |
| `PENDING_APPROVAL` | Traveler / Provider | CANCELLED + hoàn 100% |
| `CONFIRMED`, ≥3 ngày trước start | Traveler | CANCELLED + hoàn 100% deposit |
| `CONFIRMED`, <3 ngày trước start | Traveler | CANCELLED + mất deposit |
| `CONFIRMED` | Provider | CANCELLED + hoàn 100% |
| `IN_PROGRESS` / `COMPLETED` | Bất kỳ | ❌ Throw exception |

---

## Phase 1 — Schema Migration

> **Phụ thuộc:** Không có | **Unblocks:** Tất cả phases còn lại

### Checklist
- [ ] Sửa enum `BookingStatus`
- [ ] Thêm enum `DeliveryMethod`, `CancelledBy`, `ModifyRequestStatus`
- [ ] Sửa model `Listing` — thêm 4 fields
- [ ] Sửa model `Booking` — thêm 8 fields
- [ ] Thêm model `ListingAvailability`
- [ ] Thêm model `Cart` + `CartItem`
- [ ] Thêm model `BookingModifyRequest`
- [ ] Run `npx prisma migrate dev --name cal_book_foundation`

### Enums

```prisma
enum BookingStatus {
  PENDING_PAYMENT   // vừa tạo, chưa thanh toán
  PENDING_APPROVAL  // đã trả tiền, chờ provider duyệt
  CONFIRMED         // provider đã duyệt
  IN_PROGRESS       // đang trong kỳ thuê
  COMPLETED
  CANCELLED
  DISPUTED          // đang tranh chấp — lock listing
  REFUNDING         // giữ lại cho PAY flow
  REFUNDED
}

enum DeliveryMethod { PICKUP | DELIVERY }
enum CancelledBy    { TRAVELER | PROVIDER | SYSTEM }
enum ModifyRequestStatus { PENDING | ACCEPTED | REJECTED }
```

### Sửa `Listing`

```prisma
minRentalDays Int     @default(1)
maxRentalDays Int?                           // null = không giới hạn
quantity      Int     @default(1)            // tổng stock
depositRate   Decimal @default(0.30) @db.Decimal(3, 2)

// relations
availability  ListingAvailability[]
cartItems     CartItem[]
```

### Sửa `Booking`

```prisma
quantity           Int            @default(1)
depositAmount      Decimal        @db.Decimal(10, 2)
deliveryMethod     DeliveryMethod @default(PICKUP)
deliveryAddress    String?
cancelledBy        CancelledBy?
cancellationReason String?
cancelledAt        DateTime?
holdExpiresAt      DateTime?      // BOOK-03
checkedInAt        DateTime?      // BOOK-08 (deferred, thêm sẵn)
checkedOutAt       DateTime?      // BOOK-08 (deferred, thêm sẵn)

modifyRequests     BookingModifyRequest[]
```

### Model mới: `ListingAvailability`

```prisma
model ListingAvailability {
  id        String   @id @default(cuid())
  listingId String
  date      DateTime @db.Date
  isBlocked Boolean  @default(true)
  note      String?
  createdAt DateTime @default(now())

  listing Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@unique([listingId, date])
  @@index([listingId])
}
```

### Model mới: `Cart` + `CartItem`

```prisma
model Cart {
  id         String     @id @default(cuid())
  travelerId String     @unique
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  traveler User       @relation(fields: [travelerId], references: [id], onDelete: Cascade)
  items    CartItem[]
}

model CartItem {
  id              String         @id @default(cuid())
  cartId          String
  listingId       String
  startDate       DateTime       @db.Date
  endDate         DateTime       @db.Date
  quantity        Int            @default(1)
  deliveryMethod  DeliveryMethod @default(PICKUP)
  deliveryAddress String?
  unitPrice       Decimal        @db.Decimal(10, 2)
  holdExpiresAt   DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  cart    Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  listing Listing @relation(fields: [listingId], references: [id])

  @@index([cartId])
  @@index([holdExpiresAt])
}
```

### Model mới: `BookingModifyRequest`

```prisma
model BookingModifyRequest {
  id            String              @id @default(cuid())
  bookingId     String
  requestedById String
  newStartDate  DateTime            @db.Date
  newEndDate    DateTime            @db.Date
  newQuantity   Int?
  reason        String?
  status        ModifyRequestStatus @default(PENDING)
  respondedAt   DateTime?
  createdAt     DateTime            @default(now())

  booking     Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  requestedBy User    @relation(fields: [requestedById], references: [id])

  @@index([bookingId])
}
```

---

## Phase 2 — BE: Availability Module (CAL-01, CAL-02)

> **Phụ thuộc:** Phase 1 | **Path:** `be/src/modules/availability/`

### Checklist
- [x] `availability.module.ts`
- [x] `availability.controller.ts`
- [x] `availability.service.ts`
- [x] `dto/availability.dto.ts` (BlockDatesDto, UnblockDatesDto, RentalConfigDto, CheckAvailabilityDto)

### Endpoints

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| `GET` | `/listings/:id/availability?from=&to=` | Public | Lấy blocked dates + booked dates theo khoảng |
| `POST` | `/listings/:id/availability/block` | Provider | Bulk block dates |
| `POST` | `/listings/:id/availability/unblock` | Provider | Bulk unblock dates |
| `GET` | `/listings/:id/rental-config` | Public | Lấy min/max days, depositRate |
| `PUT` | `/listings/:id/rental-config` | Provider | Cập nhật min/max days |

### Core: `checkAvailability(listingId, start, end, qty, excludeCartItemId?)`

```
1. Load ListingAvailability blocked dates trong [start, end]
   → any blocked → return false

2. Load Bookings status IN (PENDING_APPROVAL, CONFIRMED, IN_PROGRESS)
   overlap với [start, end] → sum(quantity)

3. Load CartItems holdExpiresAt > now, overlap [start, end],
   excludeCartItemId nếu có → sum(quantity)

4. Nếu listing.quantity - (step2 + step3) < qty → return false

5. Kiểm tra (end - start) >= minRentalDays
   Kiểm tra (end - start) <= maxRentalDays (nếu có)

6. return true
```

> **Race condition:** Bọc step 2–4 trong Prisma transaction + `SELECT ... FOR UPDATE` khi checkout.

---

## Phase 3 — BE: Booking Module (BOOK-01, 03, 04, 06, 07)

> **Phụ thuộc:** Phase 2 | **Path:** `be/src/modules/booking/`

### Checklist
- [x] `booking.module.ts`
- [x] `booking.controller.ts`
- [x] `booking.service.ts` (create, confirmPayment, findAll, findOne, approve, decline, cancel)
- [x] `dto/booking.dto.ts`
- [x] Lazy auto-start + hold-expiry (thay BullMQ, xử lý inline khi fetch)
- [x] Cancel policy đầy đủ BOOK-07

### Endpoints

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| `POST` | `/bookings` | Traveler | Tạo booking → `PENDING_PAYMENT` |
| `POST` | `/bookings/:id/confirm-payment` | Traveler | Xác nhận payment → `PENDING_APPROVAL` |
| `GET` | `/bookings` | Both | List (filter: travelerId / providerId / status) |
| `GET` | `/bookings/:id` | Both | Chi tiết |
| `POST` | `/bookings/:id/approve` | Provider | Duyệt → `CONFIRMED` + schedule auto-start job |
| `POST` | `/bookings/:id/decline` | Provider | Từ chối → `CANCELLED` + trigger refund |
| `POST` | `/bookings/:id/cancel` | Both | Huỷ theo policy (xem bảng phase này) |

### Cancellation logic (`booking-cancel.service.ts`)

```typescript
switch (booking.status) {
  case PENDING_PAYMENT:
    // chỉ cho traveler huỷ, không refund
    await prisma.booking.delete({ where: { id } });
    break;

  case PENDING_APPROVAL:
    // cả hai đều được huỷ, refund 100%
    await setStatus(CANCELLED);
    await triggerRefund(100);
    break;

  case CONFIRMED:
    if (cancelledBy === PROVIDER) {
      await setStatus(CANCELLED);
      await triggerRefund(100);
    } else {
      const daysUntil = diffDays(booking.startDate, now);
      await setStatus(CANCELLED);
      await triggerRefund(daysUntil >= 3 ? 100 : 0); // 0 = mất deposit
    }
    break;

  case IN_PROGRESS:
  case COMPLETED:
    throw new BadRequestException('Không thể huỷ đơn đang thuê / đã hoàn tất');
}
```

### BullMQ Jobs

| Job | Trigger | Action |
|-----|---------|--------|
| `hold-expiry` | delay = holdExpiresAt (15 phút) | Xoá CartItem nếu chưa checkout |
| `booking-auto-start` | delay = booking.startDate | `CONFIRMED → IN_PROGRESS` + notify cả hai |
| `booking-reminder` | delay = startDate - 3 ngày | Push notification nhắc nhở |

---

## Phase 4 — BE: Cart Module (BOOK-02, 03)

> **Phụ thuộc:** Phase 3 | **Path:** `be/src/modules/cart/`

### Checklist
- [ ] `cart.module.ts`
- [ ] `cart.controller.ts`
- [ ] `cart.service.ts`
- [ ] DTOs: `add-item`, `update-item`, `checkout`

### Endpoints

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| `GET` | `/cart` | Traveler | Lấy cart + items còn hold |
| `POST` | `/cart/items` | Traveler | Thêm item + check availability + tạo hold 15 phút |
| `PATCH` | `/cart/items/:id` | Traveler | Đổi ngày/qty + renew hold |
| `DELETE` | `/cart/items/:id` | Traveler | Xoá item (hold tự expire) |
| `POST` | `/cart/checkout` | Traveler | Tạo N bookings + 1 payment |

### Checkout flow

```
1. Validate: tất cả CartItems có holdExpiresAt > now
2. Re-check availability cho từng item (trong transaction)
3. Tạo 1 Payment record (tổng giá trị cart)
4. Với mỗi CartItem → tạo 1 Booking (PENDING_PAYMENT)
5. Confirm payment → tất cả → PENDING_APPROVAL
6. Xoá Cart
7. Notify từng Provider về booking mới
```

---

## Phase 5 — BE: Modify Booking (BOOK-05)

> **Phụ thuộc:** Phase 3 | **Path:** thêm vào `be/src/modules/booking/`

### Checklist
- [ ] `booking-modify.service.ts`
- [ ] DTOs: `modify-request`, `modify-respond`
- [ ] Endpoints

### Endpoints

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| `POST` | `/bookings/:id/modify-request` | Both | Gửi yêu cầu thay đổi |
| `POST` | `/bookings/:id/modify-respond` | Both | Chấp nhận / từ chối |

### Modify flow

```
1. Chỉ cho phép khi status = CONFIRMED
2. Tạo BookingModifyRequest (PENDING)
3. Bên kia respond:
   - ACCEPTED → re-check availability → update booking dates/qty
             → tính delta payment nếu tăng giá
   - REJECTED → BookingModifyRequest.status = REJECTED, booking giữ nguyên
```

---

## Phase 6 — FE: Provider Calendar (CAL-01, CAL-02)

> **Phụ thuộc:** Phase 2 done | **Route:** `/provider/calendar`

### Checklist
- [ ] Page: chọn listing
- [ ] Page: calendar view theo listing
- [ ] Component `AvailabilityCalendar` — month grid, click toggle
- [ ] Component `RentalConfigPanel` — min/max days form
- [ ] API hooks: `useAvailability`, `useBlockDates`, `useRentalConfig`

### UI

```
/provider/calendar
├── Sidebar: danh sách listings
└── Main: calendar grid (month view)
    ├── Xanh  = available
    ├── Đỏ    = bị block thủ công
    ├── Xám   = đã có booking confirmed
    └── Panel dưới: min/max days + deposit rate
```

---

## Phase 7 — FE: Booking Widget + Checkout (BOOK-01, 03)

> **Phụ thuộc:** Phase 3 done | **Routes:** `/listings/[id]`, `/checkout`

### Checklist
- [ ] `BookingWidget` trên trang listing detail
- [ ] `AvailabilityPicker` — date range picker, disable blocked dates
- [ ] `PriceSummary` — rental total + deposit + delivery fee
- [ ] Page `/checkout` — confirm + payment + countdown
- [ ] `HoldCountdown` component (15 phút)
- [ ] API hooks: `useCheckAvailability`, `useCreateBooking`, `useCartCheckout`

### Flow

```
Listing page
  → Chọn ngày (AvailabilityPicker)
  → Chọn số lượng + delivery method
  → Xem PriceSummary (total, deposit = 30%)
  → "Đặt ngay" → POST /cart/items (tạo hold)
  → Redirect /checkout

Checkout page
  → Hiển thị order summary
  → HoldCountdown (15 phút, hết thì redirect back)
  → Điền payment
  → POST /cart/checkout → N bookings created
  → Redirect /bookings (danh sách)
```

---

## Phase 8 — FE: Provider Approve/Decline (BOOK-04)

> **Phụ thuộc:** Phase 7 done | **Route:** `/provider/bookings`

### Checklist
- [ ] Page `/provider/bookings` — list filter PENDING_APPROVAL
- [ ] Page `/provider/bookings/[id]` — chi tiết + action buttons
- [ ] Component `ApproveDeclinePanel`
- [ ] API hooks: `useProviderBookings`, `useApproveBooking`, `useDeclineBooking`

### UI

```
/provider/bookings
├── Tabs: Chờ duyệt | Đã xác nhận | Đang thuê | Hoàn tất | Đã huỷ
└── BookingCard: avatar traveler, listing, ngày, tổng tiền, actions

/provider/bookings/[id]
├── Thông tin traveler + listing
├── Ngày thuê, số lượng, delivery method
├── [Duyệt] → confirm dialog → POST approve
└── [Từ chối] → reason input → POST decline
```

---

## Phase 9 — FE: Status Tracking + Cancel (BOOK-06, 07)

> **Phụ thuộc:** Phase 8 done | **Routes:** `/bookings`, `/bookings/[id]`

### Checklist
- [ ] Page `/bookings` — list + filter by status
- [ ] Component `StatusTimeline`
- [ ] Component `CancelModal` — preview refund + confirm
- [ ] API hooks: `useMyBookings`, `useCancelBooking`

### StatusTimeline UI

```
● Chờ duyệt  ──  ● Xác nhận  ──  ● Đang thuê  ──  ● Hoàn tất
                                               └── ◌ Đã huỷ
                                               └── ◌ Tranh chấp
```

### CancelModal

```
Hiển thị:
  "Bạn sẽ được hoàn: X VND" (tính theo policy)
  "Deposit sẽ mất: Y VND" (nếu <3 ngày)

Buttons: [Xác nhận huỷ] [Quay lại]
```

---

## Phase 10 — FE: Cart (BOOK-02)

> **Phụ thuộc:** Phase 4 done | **Route:** `/cart`

### Checklist
- [ ] Page `/cart`
- [ ] Component `CartItemCard` — listing info, dates, qty, hold countdown
- [ ] Component `CartSummary` — tổng tiền tất cả items
- [ ] Xử lý hold expired items (highlight đỏ, disable checkout)
- [ ] API hooks: `useCart`, `useAddCartItem`, `useRemoveCartItem`, `useCheckout`

### UI

```
/cart
├── CartItems grouped by provider
│   ├── CartItemCard (ảnh, tên, ngày, qty, giá, HoldCountdown)
│   └── [Xoá] button
└── CartSummary
    ├── Tổng tiền
    ├── Tổng deposit
    └── [Checkout] button (disabled nếu có item expired)
```

---

## Phase 11 — FE: Modify Booking (BOOK-05)

> **Phụ thuộc:** Phase 5 done | **Route:** `/bookings/[id]`

### Checklist
- [ ] Component `ModifyRequestForm` — date picker mới + reason
- [ ] Component `ModifyRequestStatus` — hiển thị pending/accepted/rejected
- [ ] API hooks: `useSendModifyRequest`, `useRespondModifyRequest`

### Flow

```
/bookings/[id] (status = CONFIRMED)
  → [Yêu cầu thay đổi] → ModifyRequestForm
  → Submit → POST /bookings/:id/modify-request
  → Hiển thị "Đang chờ xác nhận từ Provider"

Provider nhận notification
  → Vào /provider/bookings/[id]
  → Xem yêu cầu thay đổi
  → [Đồng ý] / [Từ chối]
```

---

## Phase 12 — Deferred (CAL-03, CAL-04, BOOK-08, BOOK-09)

> Thực hiện sau khi main flow (Phase 1–11) hoàn chỉnh và stable.

### CAL-03 — External Calendar Sync
- **Cần:** OAuth Google, iCal parser, webhook nhận event
- **Approach:** Sync 1 chiều trước (Google → FlexTrip block dates), sau đó 2 chiều

### CAL-04 — AI Conflict Detection
- **Cần:** Data từ nhiều booking channels
- **Approach:** Rule-based overlap detection trước, AI layer sau

### BOOK-08 — QR Code Check-in/Return
- **Cần:** QR generation khi `CONFIRMED`, mobile scanner, STAFF-02/03 flow
- **Approach:** Generate `qrToken` khi approve → scan validates → set `checkedInAt` / `checkedOutAt`

### BOOK-09 — AI Damage Assessment
- **Cần:** Photo upload (CONTR-04), AI image comparison
- **Approach:** Manual photo comparison UI trước → AI diff layer sau
