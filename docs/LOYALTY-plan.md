# FlexTrip — LOYALTY Implementation Plan

> **Scope:** LOYALTY-01..04 (Khách hàng thân thiết & Giới thiệu) — FE + BE
> **Ngày lập:** 2026-11-10
> **Trạng thái:** Đã chốt các quyết định chính (mục 9) — sẵn sàng làm Phase 1

---

## 1. Use Cases

| ID | Tên | Actor | Ghi chú triển khai |
|----|-----|-------|--------------------|
| LOYALTY-01 | Earn & Redeem Loyalty Points | Traveler | Mỗi booking COMPLETED = 1 điểm; đổi điểm theo bảng mốc do admin cấu hình → **voucher cá nhân** (dùng lại engine của LOYALTY-04) |
| LOYALTY-02 | Referral Program | Traveler, Provider | Mã giới thiệu cá nhân; cả hai bên nhận **voucher** (10k/20k do admin đặt) khi người được giới thiệu hoàn thành booking đầu tiên |
| LOYALTY-03 | Top-rated Provider Incentive | Provider | Job hằng đêm xác định Provider top-rated → giảm phí nền tảng |
| LOYALTY-04 | Promotion / Voucher Management | Traveler, Admin | Voucher + ngân sách khuyến mãi **tách biệt**, không đổi tỉ lệ chia 90/10 (PAY-08) |

**Thứ tự làm:** 04 → 01 → 02 → 03 (01 và 02 đều phát thưởng bằng voucher/điểm nên phụ thuộc 04; 03 độc lập, có thể làm song song).

Branch/PR theo quy ước: `feat/LOYALTY-04`, `feat/LOYALTY-01`, ...

---

## 2. Nguyên tắc thiết kế (rút ra từ code hiện tại)

### 2.1. Một đường giảm giá duy nhất
Điểm thưởng, mã giới thiệu, voucher admin đều quy về **một cơ chế: `Voucher` + `VoucherRedemption`**. Nhờ đó chỉ phải sửa luồng giá/thanh toán **một lần**:
- Đổi điểm = tạo voucher cá nhân (source `POINTS`).
- Thưởng referral = cấp voucher cá nhân (source `REFERRAL`) hoặc cộng điểm.
- Admin tạo campaign = voucher công khai (source `ADMIN`).

### 2.2. Giữ nguyên 90/10 — tiền giảm giá do ngân sách khuyến mãi chịu
Hiện trạng:
- `booking.service.ts:94` và `cart.service.ts:264` tính `totalPrice = unitPrice × qty × days`, `depositAmount = totalPrice × depositRate`.
- `payments.service.ts:60` thu cọc trước, `rentalAmount = totalPrice − depositAmount` thu sau khi provider duyệt (`payRental`, dòng 320).
- `commission.service.ts` chia hoa hồng trên `payment.totalAmount − refundedAmount` (`COMMISSION_RATES`: platform 8% + staff 2% hoặc platform 10%; provider 90%).
- Escrow chỉ giữ phần traveler trả bằng ví (`walletPaid`).

Quyết định:
1. `Booking.totalPrice` và `Payment.totalAmount` **giữ là giá gốc (gross)**. Hoa hồng vẫn tính trên gross → Provider luôn nhận 90% giá gốc.
2. Thêm `discountAmount` vào Booking và Payment. Traveler chỉ trả `rentalAmount = totalPrice − depositAmount − discountAmount`. **Giảm giá trừ vào phần tiền thuê trả sau, không đụng tiền cọc.**
3. Khi thu phần tiền thuê (`payRental`, và checkout giỏ hàng nơi Payment tạo sẵn `PAID`), ghi một giao dịch **`PromoBudgetTransaction`** trừ ngân sách và `escrow.credit(discountAmount)`. Escrow nhờ vậy vẫn đủ tiền gross để `CommissionService.split` chia như cũ, không phải sửa công thức `escrowOut`.
4. `discountAmount` bị chặn tối đa bằng `rentalAmount` gốc, `maxDiscount` của voucher và số dư ngân sách còn lại.

> Hệ quả: phần giảm giá không làm Provider hay phí nền tảng biến động. Nền tảng chịu chi phí qua `PromoBudget`, đúng mô tả "ngân sách khuyến mãi tách biệt".

### 2.3. LOYALTY-03 thì khác — nó thay đổi phí nền tảng, có chủ đích
Incentive Provider giảm `PLATFORM_BASE`/`PLATFORM_NO_STAFF` thêm `x` điểm phần trăm. Đây là thay đổi tỉ lệ có chủ đích, tách khỏi voucher. Cần **snapshot tỉ lệ đã áp dụng** vào `CommissionLedger` để audit (xem 4.4). Staff share (2%) giữ nguyên.

### 2.4. Theo quy ước dự án
- Mỗi tính năng = một module trong `be/src/modules/`; business logic ở Service, input qua DTO + class-validator, lỗi qua NestJS exceptions.
- Job nền dùng **BullMQ**, theo mẫu `REPORT_SCHEDULE_QUEUE` (`upsertJobScheduler` + processor).
- Cấu hình số học cho admin chỉnh dùng `system-config/config-registry.ts` (thêm group `loyalty`).
- Sửa `schema.prisma` thì chạy `npx prisma migrate dev --name <name>` và commit migration.
- FE: React Query hook trong `hooks/`, API trong `lib/api/`, Zod trong `lib/validators/`, chỉ gọi API qua `lib/api/client.ts`.

---

## 3. Data model (Prisma)

Làm theo từng migration, mỗi use case một migration để dễ review/rollback.

### 3.1. Migration `add_vouchers` (LOYALTY-04)

```prisma
enum VoucherType      { PERCENT FIXED }
enum VoucherStatus    { DRAFT ACTIVE PAUSED EXPIRED }
enum VoucherSource    { ADMIN POINTS REFERRAL }
enum VoucherAudience  { ALL NEW_USER PERSONAL }          // PERSONAL: gắn assignedUserId
enum RedemptionStatus { RESERVED APPLIED FORFEITED RELEASED }

model PromoBudget {
  id          String   @id @default(cuid())
  name        String
  totalAmount Decimal  @db.Decimal(12, 2)
  spentAmount Decimal  @default(0) @db.Decimal(12, 2)     // đã trừ thật (APPLIED)
  reservedAmount Decimal @default(0) @db.Decimal(12, 2)   // đang giữ chỗ (RESERVED)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  vouchers    Voucher[]
}

model Voucher {
  id             String          @id @default(cuid())
  code           String          @unique                   // lưu UPPERCASE
  name           String
  description    String?
  type           VoucherType
  value          Decimal         @db.Decimal(10, 2)        // % hoặc VND
  maxDiscount    Decimal?        @db.Decimal(10, 2)        // trần cho PERCENT
  minOrderValue  Decimal         @default(0) @db.Decimal(10, 2)
  category       String?                                   // null = mọi danh mục (Listing.category là String)
  audience       VoucherAudience @default(ALL)
  assignedUserId String?
  source         VoucherSource   @default(ADMIN)
  status         VoucherStatus   @default(DRAFT)
  startsAt       DateTime
  endsAt         DateTime
  totalQuota     Int?                                       // null = không giới hạn
  usedCount      Int             @default(0)
  perUserLimit   Int             @default(1)
  budgetId       String
  createdById    String?
  createdAt      DateTime        @default(now())

  budget      PromoBudget         @relation(fields: [budgetId], references: [id])
  assignedTo  User?               @relation("AssignedVouchers", fields: [assignedUserId], references: [id], onDelete: Cascade)
  redemptions VoucherRedemption[]

  @@index([status, startsAt, endsAt])
  @@index([assignedUserId])
}

model VoucherRedemption {
  id             String           @id @default(cuid())
  voucherId      String
  userId         String
  bookingId      String           @unique                  // 1 booking tối đa 1 voucher
  discountAmount Decimal          @db.Decimal(10, 2)
  status         RedemptionStatus @default(RESERVED)
  createdAt      DateTime         @default(now())
  appliedAt      DateTime?
  releasedAt     DateTime?

  voucher Voucher @relation(fields: [voucherId], references: [id])
  user    User    @relation(fields: [userId], references: [id])
  booking Booking @relation(fields: [bookingId], references: [id])

  @@index([voucherId, userId])
}

model PromoBudgetTransaction {            // sổ cái ngân sách, chống lệch số
  id          String   @id @default(cuid())
  budgetId    String
  redemptionId String?
  amount      Decimal  @db.Decimal(12, 2)  // âm = chi, dương = hoàn/nạp
  note        String?
  createdAt   DateTime @default(now())
  @@index([budgetId])
}
```

Sửa thêm:
- `Booking`: `discountAmount Decimal @default(0)`, quan hệ `voucherRedemption VoucherRedemption?`.
- `Payment`: `discountAmount Decimal @default(0)`.

### 3.2. Migration `add_loyalty_points` (LOYALTY-01)

```prisma
enum LoyaltyTxType { EARN REDEEM EXPIRE ADJUST }

model LoyaltyAccount {
  userId         String   @id
  balance        Int      @default(0)
  lifetimePoints Int      @default(0)                      // tổng điểm đã tích, chỉ tăng (hiển thị thống kê)
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions   LoyaltyTransaction[]
}

model LoyaltyTransaction {
  id           String        @id @default(cuid())
  userId       String
  type         LoyaltyTxType
  points       Int                                          // dương = cộng, âm = trừ
  balanceAfter Int
  refType      String                                       // 'booking' | 'reward'
  refId        String
  note         String?
  expiresAt    DateTime?                                    // chỉ cho EARN (dùng ở Phase 5)
  createdAt    DateTime      @default(now())

  account LoyaltyAccount @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@unique([userId, type, refType, refId])                  // idempotent: gọi lặp không cộng 2 lần
  @@index([userId, createdAt])
}

// Bảng mốc đổi thưởng do admin cấu hình, ví dụ: 10 điểm → voucher 20.000đ
model LoyaltyReward {
  id           String      @id @default(cuid())
  name         String
  pointsCost   Int
  voucherType  VoucherType @default(FIXED)
  voucherValue Decimal     @db.Decimal(10, 2)
  maxDiscount  Decimal?    @db.Decimal(10, 2)
  validDays    Int         @default(30)                     // hạn dùng voucher sau khi đổi
  isActive     Boolean     @default(true)
  sortOrder    Int         @default(0)
  createdAt    DateTime    @default(now())
}
```

### 3.3. Migration `add_referrals` (LOYALTY-02)

```prisma
enum ReferralStatus { REGISTERED QUALIFIED REWARDED REJECTED }

// User: thêm  referralCode String? @unique   (sinh lười khi user mở trang giới thiệu)
model Referral {
  id          String         @id @default(cuid())
  referrerId  String
  refereeId   String         @unique                        // mỗi người chỉ có 1 người giới thiệu
  code        String
  status      ReferralStatus @default(REGISTERED)
  rejectReason String?
  qualifiedBookingId String?
  rewardedAt  DateTime?
  createdAt   DateTime       @default(now())

  referrer User @relation("Referrer", fields: [referrerId], references: [id])
  referee  User @relation("Referee",  fields: [refereeId],  references: [id])

  @@index([referrerId, status])
}
```

### 3.4. Migration `add_provider_incentives` (LOYALTY-03)

```prisma
model ProviderIncentive {
  id                  String   @id @default(cuid())
  providerId          String   @unique
  isTopRated          Boolean  @default(false)
  score               Decimal  @db.Decimal(5, 2)
  feeDiscountPct      Decimal  @default(0) @db.Decimal(4, 2)   // điểm % trừ vào phí nền tảng
  reasons             Json                                      // chỉ số + lời giải thích tiếng Việt
  validUntil          DateTime
  computedAt          DateTime @default(now())
  provider            User     @relation(fields: [providerId], references: [id], onDelete: Cascade)
}
```
Thêm vào `CommissionLedger`: `platformRate Decimal?`, `incentiveDiscountPct Decimal?` (snapshot).

### 3.5. Config (không cần migration)
Thêm group `loyalty` vào `ConfigDefinition['group']` và `CONFIG_GROUP_LABELS`, thêm các key vào `CONFIG_REGISTRY` (giá trị mặc định chỉ là đề xuất, admin chỉnh được):

| Key | Mặc định | Ý nghĩa |
|-----|---------|---------|
| `loyalty_points_per_order` | 1 | Điểm cho mỗi booking COMPLETED |
| `referral_referee_voucher_vnd` | 20.000 | Voucher cho người được giới thiệu |
| `referral_referrer_voucher_vnd` | 10.000 | Voucher cho người giới thiệu (Traveler hoặc Provider) |
| `referral_voucher_valid_days` | 30 | Hạn dùng voucher giới thiệu |
| `referral_monthly_cap` | 10 | Số lượt thưởng tối đa/người giới thiệu/tháng |
| `top_rated_fee_discount_pct` | 2 | Giảm phí cho Provider top-rated |
| `top_rated_min_score` | 80 | Ngưỡng điểm top-rated |

Bảng mốc đổi điểm không nằm ở đây mà ở bảng `LoyaltyReward` (nhiều dòng, có thêm/xóa). Seed mẫu: `10 điểm → 20.000đ`, `30 điểm → 70.000đ`.

---

## 4. Backend

### 4.1. Module `vouchers` — LOYALTY-04

```
be/src/modules/vouchers/
  vouchers.module.ts
  vouchers.controller.ts          # traveler: GET /vouchers/mine, POST /vouchers/validate
  vouchers.service.ts             # quote / reserve / apply / release
  dto/ validate-voucher.dto.ts
  __tests__/
be/src/modules/admin/vouchers/
  admin-vouchers.controller.ts    # @Roles(Role.ADMIN): CRUD voucher, pause, thống kê
  admin-promo-budgets.controller.ts
  dto/
```

**API**

| Method | Path | Actor | Mô tả |
|--------|------|-------|-------|
| GET | `/vouchers/mine` | Traveler | Voucher đang dùng được (công khai còn hạn + cá nhân) |
| POST | `/vouchers/validate` | Traveler | `{ code, listingId, startDate, endDate, quantity }` → `{ discountAmount, payableRental, reason? }` (xem trước, không giữ chỗ) |
| GET/POST/PATCH | `/admin/vouchers` | Admin | CRUD, đổi trạng thái |
| GET | `/admin/vouchers/:id/redemptions` | Admin | Ai dùng, khi nào, bao nhiêu |
| GET/POST/PATCH | `/admin/promo-budgets` | Admin | Quản lý ngân sách, xem đã chi / còn lại |

**`VouchersService`**
- `quote(userId, code, { totalPrice, depositAmount, category })` → kiểm tra: trạng thái ACTIVE, trong `startsAt..endsAt`, đủ `minOrderValue`, đúng `category`/`audience`/`assignedUserId`, `perUserLimit`, còn `totalQuota`, ngân sách còn đủ. Trả `discountAmount = min(tính theo type, maxDiscount, rentalAmount, ngân sách còn lại)` và mã lý do khi từ chối.
- `reserve(tx, bookingId, userId, quote)` — chạy **trong transaction tạo booking**. Dùng update có điều kiện để chống race:
  `updateMany({ where: { id, usedCount: { lt: totalQuota } }, data: { usedCount: { increment: 1 } } })` và tương tự cho `PromoBudget.reservedAmount`. Nếu `count === 0` → ném `BadRequestException`.
- `apply(tx, bookingId)` — gọi khi thu tiền thuê: `RESERVED → APPLIED`, chuyển `reservedAmount → spentAmount`, ghi `PromoBudgetTransaction`.
- `onBookingCancelled(tx, bookingId)` — **huỷ không trả lại voucher**, quy tắc theo trạng thái lúc huỷ:

| Lúc huỷ / hết hạn | Redemption | Quota & giới hạn mỗi người | Ngân sách |
|---|---|---|---|
| Chưa trả cọc (hết hạn giữ chỗ 15 phút, thanh toán lỗi) | `RESERVED → RELEASED` | hoàn lại | hoàn `reservedAmount` |
| Đã trả cọc, chưa trả tiền thuê (huỷ, hết hạn `balanceDueAt`) | `RESERVED → FORFEITED` | **mất** | hoàn `reservedAmount` (chưa chi tiền) |
| Đã trả tiền thuê (`APPLIED`) | giữ `APPLIED` | **mất** | đã chi, không hoàn |
| **Provider từ chối/huỷ** (ở bất kỳ trạng thái nào) | `→ RELEASED` | hoàn lại | hoàn nếu chưa chi; nếu đã `APPLIED` thì hoàn phần ngân sách đã chi |

Lý do `RELEASED` ở dòng đầu: traveler chưa trả tiền thì chưa "dùng" voucher, nếu không hết hạn giữ chỗ 15 phút sẽ đốt voucher oan. Trường hợp **provider từ chối/huỷ** (lỗi không phải của traveler) thì luôn trả lại voucher (dòng cuối bảng): `onBookingCancelled` cần biết ai huỷ qua `Booking.cancelledBy` (`CancelledBy`).

**Điểm tích hợp (sửa code sẵn có)**

| File | Thay đổi |
|------|---------|
| `booking/dto` (create booking) | thêm `voucherCode?: string` |
| `booking/booking.service.ts:94` | sau khi tính `totalPrice`/`depositAmount`: nếu có `voucherCode` → `quote` + `reserve`, lưu `discountAmount` |
| `cart/cart.service.ts:264` | **mỗi mã chỉ áp cho một item** trong giỏ (người dùng chọn item); voucher chỉ giữ chỗ lúc checkout, chi ngân sách khi trả tiền thuê như đơn thường |
| `payments/payments.service.ts:60,320` | `rentalAmount = total − deposit − discount`; trong `payRental` gọi `vouchers.apply` + `escrow.credit(discount)` |
| `booking/booking.processor.ts` (`handleHoldExpiry`, `handleBalanceExpiry`) và các đường huỷ trong `booking.service.ts` | gọi `vouchers.onBookingCancelled` (quy tắc ở dưới) |
| `payments/refund.service.ts` | **cần đọc kỹ**: hoàn tiền chỉ trả phần traveler đã trả thật; voucher không được trả lại (xem quy tắc dưới) |

**Job nền:** cron/BullMQ đánh dấu voucher quá `endsAt` thành `EXPIRED` (có thể gộp vào tick job sẵn có; không cần queue mới).

### 4.2. Module `loyalty` — LOYALTY-01

```
be/src/modules/loyalty/
  loyalty.module.ts
  loyalty.controller.ts       # GET /loyalty/me, GET /loyalty/transactions, GET /loyalty/rewards, POST /loyalty/redeem
  loyalty.service.ts          # earn / redeem
be/src/modules/admin/loyalty/
  admin-loyalty.controller.ts # @Roles(Role.ADMIN): CRUD LoyaltyReward, thống kê điểm
```

- **Earn:** `earnForBooking(bookingId)` cộng `loyalty_points_per_order` (mặc định 1) cho traveler khi booking chuyển sang COMPLETED. Idempotent nhờ `@@unique([userId, type, refType, refId])` nên gọi lặp không cộng hai lần. Gọi tại **điểm duy nhất booking chuyển sang COMPLETED** (`booking.processor.ts:225 handleAutoComplete` và mọi chỗ khác chuyển COMPLETED — dùng grep xác minh khi code).
- **Redeem:** `POST /loyalty/redeem { rewardId }` — trong một transaction: kiểm tra `LoyaltyReward.isActive`, trừ điểm bằng update có điều kiện (`balance >= pointsCost`), tạo `Voucher` cá nhân (`source: POINTS`, `audience: PERSONAL`, hạn `validDays`, thuộc `PromoBudget` hệ thống "Loyalty"), ghi `LoyaltyTransaction` loại `REDEEM`. Nếu ngân sách "Loyalty" cạn → từ chối đổi với thông báo rõ ràng.
- **Không hoàn điểm / không trừ điểm ngược:** điểm đã cộng không bị thu hồi khi hoàn tiền sau đó, và đổi điểm xong thì không hoàn điểm (nhất quán với quy tắc "huỷ không trả voucher").
- **Hết hạn điểm:** `expiresAt` có trong schema nhưng bản đầu chưa chạy job; để Phase 5.
- **Quyền riêng tư:** chỉ trả dữ liệu của chính user (`@CurrentUser`); chỉ admin xem được của người khác.

### 4.3. Module `referrals` — LOYALTY-02

```
be/src/modules/referrals/
  referrals.module.ts
  referrals.controller.ts    # GET /referrals/me (mã, link, thống kê), GET /referrals/me/list
  referrals.service.ts
```

- **Sinh mã:** `GET /referrals/me` tạo lười `User.referralCode` (8 ký tự A-Z0-9 bỏ ký tự dễ nhầm `0/O/1/I`), retry khi trùng unique.
- **Đăng ký:** `auth/dto/register.dto.ts` thêm `referralCode?: string` (optional, `@IsOptional @Matches`). Trong service đăng ký (thư mục `auth/services`) sau khi tạo user: `referrals.attach(refereeId, code)`. **Mã sai không được làm hỏng đăng ký** — bỏ qua im lặng (hoặc trả cảnh báo mềm), vì `RegisterRateLimitGuard` đã chặn spam.
- **Chống gian lận khi attach / qualify:**
  - Không tự giới thiệu (`referrerId !== refereeId`), từ chối nếu cùng số điện thoại hoặc cùng email root.
  - Mỗi referee chỉ một referrer (`@unique refereeId`).
  - Trần `referral_monthly_cap` lượt thưởng/tháng/người giới thiệu.
  - Thưởng chỉ khi referee có **booking COMPLETED đầu tiên** (không thưởng khi mới đăng ký) — chặn tạo tài khoản ảo.
- **Qualify + thưởng:** hook cùng điểm COMPLETED như 4.2: nếu booking này là booking COMPLETED đầu tiên của referee và `Referral.status = REGISTERED` → `QUALIFIED` → cấp thưởng → `REWARDED` (một transaction, idempotent). **Cả hai bên nhận voucher cá nhân** (`source: REFERRAL`) do admin đặt mệnh giá:
  - Referee: `referral_referee_voucher_vnd` — cấp **ngay lúc đăng ký** (để kích cầu đặt đơn đầu), không chờ qualify.
  - Referrer (Traveler **hoặc** Provider): `referral_referrer_voucher_vnd` — cấp khi referee qualify.
  - Voucher luôn là voucher thuê đồ nên chỉ dùng được khi tài khoản có role Traveler; Provider-only giữ voucher trong "Voucher của tôi" và dùng khi có role Traveler. `quote` phải kiểm tra role này và trả lý do rõ ràng thay vì lỗi chung.
- **Thông báo:** dùng `NotificationsService` với `NotificationType.SYSTEM` (không cần đổi enum).

### 4.4. Module `provider-incentives` — LOYALTY-03

```
be/src/modules/provider-incentives/
  provider-incentives.module.ts
  provider-incentives.constants.ts   # PROVIDER_INCENTIVE_QUEUE, tick job
  provider-incentives.processor.ts   # tính hằng đêm
  provider-incentives.service.ts
  provider-incentives.controller.ts  # GET /providers/me/incentive
```

- **Chấm điểm (deterministic, giống chiến lược hybrid của PRICE):** score 0–100 từ
  rating trung bình có hiệu chỉnh Bayesian theo số review (từ `Review`/`ProviderProfile`), tỉ lệ booking hoàn thành, `cancellationStrikes`, `responseTimeH`, tỉ lệ review `ReviewSentiment` tích cực, và tái dụng `ReputationService` (`TRUSTED_PROVIDER`) làm điều kiện cần.
- **Vai trò AI:** gọi Groq (đã tích hợp) **chỉ để sinh lời giải thích tiếng Việt** lưu vào `reasons`. Quyết định có ưu đãi hay không dựa trên score + ngưỡng, không để LLM quyết định tiền. Nếu AI lỗi → dùng câu giải thích mẫu.
- **Áp dụng phí:** trong `CommissionService.split` đọc `ProviderIncentive` còn hạn: `platformRate = base − feeDiscountPct` (có sàn, ví dụ ≥ 5%), phần chênh cộng vào `providerNet`. **Ghi snapshot** `platformRate`, `incentiveDiscountPct` vào `CommissionLedger`. Staff share giữ nguyên. Cập nhật `commission.service.ts` và `COMMISSION_RATES` consumer ở `fix-deposit-as-price.ts` cho nhất quán.
- **Lịch chạy:** `upsertJobScheduler` mỗi đêm; `validUntil = now + 48h` để nếu job lỗi, ưu đãi tự hết hạn thay vì kéo dài mãi.
- **Mất ưu đãi:** khi score tụt dưới ngưỡng, lần tính sau đặt `isTopRated=false`, `feeDiscountPct=0`. Booking đã chốt ledger không bị tính lại.

### 4.5. Phân quyền, audit, test
- Endpoint traveler/provider: `@UseGuards(JwtAuthGuard)`; admin: `@Roles(Role.ADMIN)` như `admin/config`.
- Mọi thao tác admin trên voucher/ngân sách ghi `AuditLog`.
- **Jest** (`__tests__/`, theo mẫu `reputation.service.spec.ts`, `messages.spec.ts`):
  - voucher: quote từng điều kiện từ chối; hai request đồng thời tranh quota cuối (chỉ một thắng); ngân sách cạn; bảng huỷ 3 trạng thái (RELEASED/FORFEITED/APPLIED) hoàn quota và ngân sách đúng như quy tắc.
  - tiền: booking có voucher → `payment.discountAmount`, `providerNet` **bằng đúng** khi không có voucher (kiểm chứng 90/10), escrow không âm.
  - loyalty: earn idempotent, redeem không đủ điểm, redeem đồng thời (không đổi âm điểm), ngân sách Loyalty cạn.
  - referral: self-referral, trùng referee, vượt cap, thưởng đúng một lần, booking đầu tiên, Provider-only nhận voucher nhưng chưa dùng được.
  - incentive: dưới/trên ngưỡng, hết hạn, snapshot ledger.

---

## 5. Frontend

### 5.1. Types / API / hooks / validators

| Loại | File mới |
|------|---------|
| `types/` | `voucher.ts`, `loyalty.ts`, `referral.ts`, `incentive.ts` |
| `lib/api/` | `vouchers.ts`, `loyalty.ts`, `referrals.ts`, `incentives.ts` (+ các hàm admin trong `admin.ts` hoặc `admin-vouchers.ts`) — đều qua `client.ts` |
| `hooks/` | `useVouchers.ts`, `useLoyalty.ts`, `useReferrals.ts`, `useProviderIncentive.ts`, `hooks/admin/use-admin-vouchers.ts` |
| `lib/validators/` | `voucher.schema.ts` (form admin: code, type, value, hạn, quota, ngân sách…) |

### 5.2. Traveler

| Màn hình | Đường dẫn | Nội dung |
|----------|-----------|---------|
| Điểm thưởng | `app/(main)/profile/loyalty/page.tsx` | Số dư điểm, thanh tiến độ tới mốc đổi thưởng kế tiếp (ví dụ "7/10 đơn → voucher 20k"), lịch sử, nút đổi điểm → voucher |
| Voucher của tôi | `app/(main)/profile/vouchers/page.tsx` | Tab "Đang dùng được / Đã dùng / Hết hạn", nút sao chép mã |
| Giới thiệu bạn bè | `app/(main)/profile/referral/page.tsx` | Mã + link `?ref=CODE`, nút chia sẻ/sao chép, thống kê (đã đăng ký / đã hoàn thành / đã thưởng) |
| Áp mã khi đặt | `components/listing/booking-widget.tsx` | Ô nhập mã + danh sách voucher gợi ý; gọi `/vouchers/validate` (debounce, dùng `use-debounced-value.ts`); hiển thị dòng "Giảm giá" và số tiền thuê phải trả |
| Giỏ hàng | `app/(main)/cart` | Ô nhập mã ở bước thanh toán |
| Chi tiết đơn / hoá đơn | `bookings/[id]/page.tsx`, `types/invoice.ts` | Thêm dòng giảm giá |
| Đăng ký | `app/(auth)/register` + `lib/validators/auth.schema.ts` | Đọc `?ref=` từ URL, hiển thị ô "Mã giới thiệu" (điền sẵn, sửa được) |
| Điều hướng | `components/layout/site-header.tsx` | Mục "Điểm thưởng & Voucher" trong menu người dùng (mảng `travelerMenu` quanh dòng 195) |

Thêm trang vào `TRAVELER_PATHS` của `traveler-footer.tsx` nếu muốn hiện footer.

### 5.3. Provider
- `app/(main)/dashboard/incentives/page.tsx` (hoặc một khối trên dashboard): trạng thái **Top-rated**, điểm, các chỉ số còn thiếu để đạt, mức giảm phí hiện tại và ngày hết hạn. Tái dùng component tiến độ của trang reputation (`useReputation.ts`, `types/reputation.ts`).
- Hiện huy hiệu "Top-rated" cạnh `ReputationBadge` ở trang listing và trang provider.
- Provider cũng có trang giới thiệu (tái dùng component của traveler, đặt trong layout dashboard); voucher nhận được xem ở trang "Voucher của tôi" khi tài khoản có role Traveler, nếu không thì hiển thị ghi chú giải thích.

### 5.4. Admin (`app/admin/`)

| Trang | Nội dung |
|-------|---------|
| `15-vouchers/` | Bảng voucher (lọc theo trạng thái/nguồn), form tạo/sửa (react-hook-form + zod), tạm dừng/kích hoạt, xem lượt dùng |
| `16-promo-budgets/` | Ngân sách: tổng / đã chi / đang giữ / còn lại, biểu đồ chi theo thời gian |
| `17-loyalty/` | Bảng mốc đổi thưởng (thêm/sửa/tắt `LoyaltyReward`), thống kê điểm phát hành / đã đổi, danh sách Provider top-rated và lý do, referral đáng ngờ (REJECTED) |
| Cấu hình | Nhóm `loyalty` xuất hiện tự động ở trang cấu hình sẵn có (`08-ai-config`) nhờ registry; kiểm tra trang đó có render động theo `group` không |

Thêm vào sidebar `app/admin/layout.tsx` và đảm bảo `audit-log` hiển thị tên hành động mới.

---

## 6. Lộ trình triển khai

### Phase 0 — Chuẩn bị (0.5 ngày)
- [ ] Chốt các câu hỏi mục 9.
- [ ] Đọc `refund.service.ts`, `escrow.service.ts` và các điểm chuyển COMPLETED để xác nhận hook point.

### Phase 1 — LOYALTY-04 Voucher (`feat/LOYALTY-04`)
- [ ] Migration `add_vouchers` (+ `discountAmount` cho Booking/Payment)
- [ ] `vouchers` module + admin controllers + DTO
- [ ] Tích hợp `booking.service`, `cart.service`, `payments.service` (deposit/payRental), release ở huỷ/hết hạn
- [ ] Test tiền (90/10 không đổi) + test race quota/ngân sách
- [ ] FE: booking-widget, cart, trang voucher của tôi, admin 15 + 16, hiển thị trên hoá đơn

### Phase 2 — LOYALTY-01 Điểm (`feat/LOYALTY-01`)
- [ ] Migration `add_loyalty_points` (+ seed `LoyaltyReward` mẫu), config registry group `loyalty`
- [ ] `loyalty` module, hook earn tại điểm COMPLETED, redeem → voucher, admin CRUD bảng mốc
- [ ] FE: trang `profile/loyalty`, admin 17 (bảng mốc), mục menu

### Phase 3 — LOYALTY-02 Giới thiệu (`feat/LOYALTY-02`)
- [ ] Migration `add_referrals`, `register.dto` + attach khi đăng ký
- [ ] `referrals` module, chống gian lận, voucher cho referee lúc đăng ký + voucher cho referrer khi COMPLETED đầu tiên
- [ ] FE: trang `profile/referral`, `?ref=` ở đăng ký, admin xem referral đáng ngờ

### Phase 4 — LOYALTY-03 Top-rated (`feat/LOYALTY-03`) *(có thể làm song song từ Phase 1)*
- [ ] Migration `add_provider_incentives` (+ snapshot ở `CommissionLedger`)
- [ ] Processor hằng đêm, chấm điểm, lời giải thích AI có fallback
- [ ] Sửa `CommissionService.split` + test snapshot
- [ ] FE: trang provider incentive, huy hiệu, admin 17

### Phase 5 — Hoàn thiện
- [ ] Hết hạn điểm (job), hết hạn voucher
- [ ] Thông báo (điểm cộng, voucher sắp hết hạn, đạt top-rated)
- [ ] Seed dữ liệu demo (voucher mẫu, ngân sách) trong `prisma/seed.ts`
- [ ] E2E Playwright: áp voucher → thanh toán → kiểm tra số tiền; đăng ký bằng `?ref=`
- [ ] Cập nhật `docs/Payment_Flow_Report.md` với luồng discount/escrow mới

---

## 7. Rủi ro kỹ thuật cần chú ý

1. **Race condition quota/ngân sách:** luôn dùng update có điều kiện trong transaction; không đọc rồi ghi.
2. **Lệch sổ escrow:** nếu quên `escrow.credit(discount)` khi thu tiền thuê, `escrowOut` ở `split` có thể làm escrow âm. Có test riêng.
3. **Hai đường tạo booking:** `booking.service` (đặt trực tiếp, cọc trước) và `cart.service` (Payment tạo sẵn `PAID`, status `PENDING_APPROVAL`) khác nhau — voucher phải chạy đúng ở cả hai.
4. **Hoàn tiền một phần:** `commission.split` dùng `totalAmount − refundedAmount`; cần kiểm tra cách tính này khi booking có `discountAmount` (traveler chỉ trả phần sau giảm, voucher không hoàn).
5. **Gian lận referral / farm voucher:** thưởng muộn (sau COMPLETED), cap theo tháng, `perUserLimit`, rate limit đã có ở đăng ký.
6. **LOYALTY-03 chạm vào hoa hồng:** sửa `CommissionService` là vùng nhạy cảm, cần review thêm từ người phụ trách PAY và snapshot đầy đủ để đối soát.
7. **Hiệu năng tick job:** tính incentive theo batch Provider, chỉ xét Provider có hoạt động trong 90 ngày.

---

## 8. Ngoài phạm vi (bản đầu)
- Cộng dồn nhiều voucher trên một booking (bản đầu: tối đa 1 voucher/booking).
- Voucher cho Provider hoặc giảm giá do Provider tự tài trợ.
- Điểm thưởng cho hành vi ngoài thuê (review, chia sẻ…).
- Mini-game/gamification, hạng thành viên (Bronze/Silver/...) — bản đầu chỉ có điểm và bảng mốc đổi thưởng.
- Hoàn điểm/thu hồi điểm khi hoàn tiền; trả lại voucher khi huỷ sau khi đã trả cọc.

---

## 9. Quyết định đã chốt & việc còn mở

### Đã chốt
| # | Quyết định |
|---|-----------|
| 1 | Giảm giá trừ vào **tiền thuê trả sau**, không trừ cọc |
| 2 | Đổi điểm = **voucher cá nhân** (một đường giảm giá duy nhất) |
| 3 | Giỏ hàng: **mỗi mã chỉ áp cho một item** |
| 4 | **Traveler huỷ không trả lại voucher** (trừ khi chưa trả cọc, xem bảng 4.1); **Provider từ chối/huỷ thì trả lại voucher**; không thu hồi điểm khi hoàn tiền |
| 5 | Referral: cả hai bên nhận **voucher 10k/20k do admin đặt**; Provider cũng nhận voucher (dùng khi thuê đồ) |
| 6 | Tích điểm **theo số đơn COMPLETED** (1 đơn = 1 điểm); bảng mốc do admin cấu hình, ví dụ 10 điểm → 20k |

> Mục 3 và 4: bạn trả lời "cả 2 đều không" cho hai câu 9.3 và 9.4 cũ; tôi hiểu là "không áp một mã cho cả giỏ" và "không trả lại voucher khi huỷ". Sửa lại nếu hiểu sai.

### Còn mở (dùng mặc định bên dưới nếu không nói gì)
| # | Câu hỏi | Mặc định |
|---|--------|----------|
| 9.1 | Sàn phí nền tảng sau khi giảm cho Provider top-rated | ≥ 5% khi không có staff, vẫn trả đủ 2% staff |
| 9.2 | Ngân sách khuyến mãi ban đầu, ai nạp, có cảnh báo khi còn dưới X% không | Admin nhập tay; cảnh báo khi còn < 20% |
| 9.3 | Hạn điểm (12 tháng) | Để Phase 5 |
| 9.4 | Mức giảm phí top-rated và ngưỡng điểm top-rated | 2 điểm % và 80 điểm (bảng 3.5) |

---

## 10. Trạng thái triển khai

Phase 1–5 đã code (chưa commit). Lệch so với kế hoạch ban đầu:
- Hết hạn điểm tính theo FIFO từ tổng (không đánh dấu từng dòng EARN); hạn mặc định 365 ngày (`loyalty_points_valid_days`).
- Seed mốc đổi thưởng nằm ở `npm run seed:loyalty` thay vì `prisma/seed.ts` (file này đang lỗi sẵn).
- Chưa làm: huy hiệu top-rated ở trang listing/provider, E2E Playwright.
