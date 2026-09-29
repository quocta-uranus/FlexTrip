# FlexTrip — Testing Booking Flows (End-to-End)

## Tài khoản seed

| Role | Email | Password |
|------|-------|----------|
| Provider 1 | `seed.provider1@flextrip.dev` | `Seed@123456` |
| Provider 2 | `seed.provider2@flextrip.dev` | `Seed@123456` |
| Traveler 1 | `seed.traveler1@flextrip.dev` | `Seed@123456` |
| Traveler 2 | `seed.traveler2@flextrip.dev` | `Seed@123456` |
| Admin | `seed.admin@flextrip.dev` | `Seed@123456` |

> Seed data: `cd be && npx ts-node prisma/seed.ts`

---

## Khởi động

```bash
# Infrastructure
docker compose up -d

# Backend (port 3001)
cd be && npm run start:dev

# Frontend (port 3000)
cd fe && npm run dev
```

Swagger: `http://localhost:3001/api/docs`  
Prisma Studio: `cd be && npx prisma studio`

Dùng **2 cửa sổ browser** (1 normal + 1 incognito) để login đồng thời 2 role.

---

## Luồng 1 — Direct Booking + Provider Approve (BOOK-01, 03, 04)

**Mục tiêu:** Traveler đặt thuê → xác nhận thanh toán → Provider duyệt → booking CONFIRMED.

### Bước thực hiện

| # | Role | Hành động | Kết quả mong đợi |
|---|------|-----------|-----------------|
| 1 | Traveler | Vào `/search`, chọn 1 listing | Mở listing detail |
| 2 | Traveler | BookingWidget: chọn ngày → **"Đặt ngay"** | Redirect `/bookings/new?listingId=...` |
| 3 | Traveler | Chọn phương thức TT → **"Đặt và thanh toán"** | Tạo booking, redirect `/bookings/:id?created=1` |
| 4 | Traveler | Kiểm tra status badge | `Chờ xác nhận` (PENDING_APPROVAL) |
| 5 | Provider | Vào `/dashboard/bookings` tab "Chờ duyệt" | Thấy đơn vừa tạo |
| 6 | Provider | Bấm **"✓ Duyệt đơn"** | Status → `CONFIRMED` |
| 7 | Traveler | Refresh `/bookings/:id` | Progress tracker bước 2 sáng lên |

### Test từ chối
- Bước 6: bấm **"Từ chối"** thay vì duyệt → nhập lý do → xác nhận → status → `CANCELLED`

### API tương ứng
```
POST /bookings                          # tạo booking
POST /bookings/:id/confirm-payment      # xác nhận TT
GET  /bookings?as=provider&status=PENDING_APPROVAL
POST /bookings/:id/approve
POST /bookings/:id/decline
```

---

## Luồng 2 — Cart Checkout (BOOK-02)

**Mục tiêu:** Thêm nhiều listing vào giỏ → checkout cùng lúc → tạo N bookings.

### Bước thực hiện

| # | Role | Hành động | Kết quả mong đợi |
|---|------|-----------|-----------------|
| 1 | Traveler | Mở listing #1 → BookingWidget → **"Thêm vào giỏ"** | Toast thành công |
| 2 | Traveler | Mở listing #2 (provider khác) → **"Thêm vào giỏ"** | Badge giỏ hàng = 2 |
| 3 | Traveler | Bấm icon giỏ trên navbar | Vào `/cart` |
| 4 | Traveler | Kiểm tra countdown giữ chỗ | Đồng hồ đếm ngược ≤ 15 phút mỗi item |
| 5 | Traveler | Xoá 1 item (nút ×) | Item biến mất, tổng cập nhật |
| 6 | Traveler | Chọn phương thức TT → **"Thanh toán cọc"** | Redirect `/bookings?checkout=1` |
| 7 | Traveler | Kiểm tra `/bookings` | N đơn mới ở status PENDING_APPROVAL |

### Test hold hết hạn
```sql
-- Prisma Studio hoặc:
UPDATE "CartItem" SET "holdExpiresAt" = NOW() - INTERVAL '1 minute';
```
Sau đó refresh `/cart` → banner đỏ, nút checkout disabled.

### API tương ứng
```
GET    /cart
POST   /cart/items
PATCH  /cart/items/:itemId
DELETE /cart/items/:itemId
POST   /cart/checkout
```

---

## Luồng 3 — Modify Booking (BOOK-05)

**Mục tiêu:** Traveler yêu cầu đổi ngày → Provider accept/reject.

**Yêu cầu:** Booking phải ở trạng thái `CONFIRMED` (hoàn thành Luồng 1 trước).

### Bước thực hiện

| # | Role | Hành động | Kết quả mong đợi |
|---|------|-----------|-----------------|
| 1 | Traveler | Vào `/bookings/:id` (booking CONFIRMED) | Thấy nút **"✏️ Yêu cầu thay đổi ngày"** |
| 2 | Traveler | Bấm nút → modal mở | Dates pre-filled từ booking hiện tại |
| 3 | Traveler | Đổi ngày mới → optionally đổi qty → **"Gửi yêu cầu"** | Modal đóng |
| 4 | Traveler | Kiểm tra trang | Nút chuyển "Đã gửi yêu cầu thay đổi" (disabled), section "Yêu cầu thay đổi (1)" badge vàng |
| 5 | Provider | Vào cùng `/bookings/:id` | Section "Yêu cầu thay đổi" hiện ngày mới + lý do |
| 6a | Provider | Bấm **"✓ Chấp nhận"** | Booking dates cập nhật, badge xanh "Đã chấp nhận" |
| 6b | Provider | Bấm **"Từ chối"** → nhập lý do | Badge đỏ "Đã từ chối" |
| 7 | Traveler | Refresh `/bookings/:id` (sau accept) | Ngày thuê đã đổi, nút modify active trở lại |

### API tương ứng
```
POST /bookings/:id/modify-requests
GET  /bookings/:id/modify-requests
POST /bookings/:id/modify-requests/:reqId/accept
POST /bookings/:id/modify-requests/:reqId/reject
```

---

## Luồng 4 — Cancel + Refund Policy (BOOK-07)

**Mục tiêu:** Verify chính sách hoàn tiền theo timing.

| Trạng thái booking | Huỷ trước khi bắt đầu | Hoàn tiền |
|-------------------|-----------------------|-----------|
| PENDING_PAYMENT | bất kỳ | Không mất tiền (chưa TT) |
| PENDING_APPROVAL | bất kỳ | Hoàn 100% tiền cọc |
| CONFIRMED | ≥ 3 ngày | Hoàn 100% tiền cọc |
| CONFIRMED | < 3 ngày | Mất cọc |

### Bước thực hiện
1. Traveler vào `/bookings/:id` → bấm **"✕ Huỷ đơn"**
2. Modal hiện thẻ chính sách hoàn tiền (xanh = hoàn / cam = mất cọc)
3. Nhập lý do (tuỳ chọn) → xác nhận
4. Status → `CANCELLED`

---

## Luồng 5 — Provider Calendar (CAL-01, 02)

**Mục tiêu:** Provider chặn/bỏ chặn ngày, cấu hình rental config.

| # | Hành động | Kết quả mong đợi |
|---|-----------|-----------------|
| 1 | Provider vào `/dashboard/listings` → chọn listing → **"📅 Quản lý lịch"** | Trang calendar |
| 2 | Click nhiều ngày → **"Chặn ngày"** | Ngày chuyển màu đỏ |
| 3 | Traveler thử đặt các ngày đó | BookingWidget báo không khả dụng |
| 4 | Provider click ngày đỏ → **"Bỏ chặn"** | Ngày trở về xanh |
| 5 | Provider form rental config: minRentalDays=2, depositRate=30 → **"Lưu"** | Config cập nhật |

---

## Edge Cases

| Case | Cách trigger | Expected |
|------|-------------|----------|
| Modify khi đã có pending request | Gửi request → thử gửi thêm | 400 "Đã có yêu cầu thay đổi đang chờ" |
| Modify booking không CONFIRMED | Gọi API trực tiếp với booking PENDING_APPROVAL | 400 "Chỉ có thể yêu cầu thay đổi khi CONFIRMED" |
| Đặt ngày bị chặn | Provider block ngày → Traveler request ngày đó | 400 "Ngày mới bị chặn bởi provider" |
| Checkout giỏ với hold hết hạn | Chỉnh `holdExpiresAt` về quá khứ → checkout | FE disabled, BE trả 400 nếu bypass |
| Đặt quá số lượng listing | Tạo nhiều booking cho cùng listing + ngày | 400 "Không đủ số lượng" |
| Traveler đặt listing của chính mình | Provider tự tạo booking cho listing mình | 400 "Không thể đặt listing của mình" |

---

## Lấy token nhanh để test Swagger

1. Mở DevTools → Application → Local Storage → `access_token`
2. Paste vào Swagger Authorize: `Bearer <token>`

Hoặc dùng cURL:
```bash
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seed.traveler1@flextrip.dev","password":"Seed@123456"}' \
  | jq -r '.accessToken'
```

---

## Trạng thái booking — state machine

```
PENDING_PAYMENT
    │ confirm-payment
    ▼
PENDING_APPROVAL
    │ approve          │ decline
    ▼                  ▼
CONFIRMED          CANCELLED
    │ auto (startDate)
    ▼
IN_PROGRESS
    │ auto (endDate)
    ▼
COMPLETED
```

Huỷ được phép từ: `PENDING_PAYMENT`, `PENDING_APPROVAL`, `CONFIRMED`.
