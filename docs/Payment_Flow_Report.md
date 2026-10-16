# Báo cáo phần thanh toán FlexTrip

Ngày: 16/10/2026. Trạng thái: toàn bộ thay đổi chưa commit.

## 1. Luồng thanh toán hiện tại

### Đặt đơn và đặt cọc
1. Khách tạo đơn, đơn ở trạng thái `PENDING_PAYMENT`, giữ chỗ 15 phút.
2. Khách chỉ trả **tiền cọc**, qua PayOS hoặc ví FlexTrip. Cọc bằng 0 thì bỏ qua bước thu tiền.
3. Trả xong, đơn sang `PENDING_APPROVAL` để chờ provider.
   - Với ví, tiền cọc bị đóng băng trong ví.
   - Với PayOS, BE ghi nhận qua webhook hoặc qua trang return.

### Provider duyệt và trả nốt
4. Provider ký hợp đồng, đơn sang `CONFIRMED`. Hệ thống đặt hạn `balanceDueAt = bây giờ + 24 giờ` và tạo job `balance-expiry`. Khách nhận thông báo.
5. Khách trả nốt tiền thuê (= tổng − cọc) qua `POST /payments/bookings/:id/pay-rental`, bằng PayOS (link mới, mã đơn riêng) hoặc ví.
   - Trả xong, provider nhận thông báo "Khách đã thanh toán đủ".
   - Với ví, tiền thuê vào quỹ trung gian của nền tảng (escrow) tới khi đơn hoàn thành.
6. **Quá 24 giờ chưa trả:** đơn tự huỷ do hệ thống và hoàn lại tiền cọc vào ví khách.

### Giao hàng và hoàn thành
7. Chưa trả nốt thì bị chặn ở 4 chỗ: provider bấm "Bắt đầu", check-in, staff xác nhận bàn giao, auto-start theo ngày.
8. Đơn `COMPLETED`: job chia hoa hồng trên **tiền thuê** (không tính cọc).
   - Có staff: provider 90%, nền tảng 8%, staff 2%.
   - Không staff: provider 90%, nền tảng 10%.
9. Tiền cọc hoàn cho khách sau 72 giờ, nếu không có tranh chấp đang mở.

### Hoàn tiền khi huỷ (tính theo số tiền khách đã trả)

| Người huỷ / thời điểm | Hoàn |
|---|---|
| Provider hoặc hệ thống huỷ | 100% số đã trả |
| Khách huỷ trước khi provider duyệt | 100% số đã trả |
| Khách huỷ sau khi duyệt, hơn 7 ngày trước ngày thuê | 100% số đã trả |
| Khách huỷ sau khi duyệt, 4–7 ngày trước | Chỉ tiền thuê (nếu đã trả), mất cọc |
| Khách huỷ sau khi duyệt, trong 3 ngày trước hoặc sau ngày thuê | 0 |

Tiền hoàn luôn vào **ví FlexTrip**, không hoàn về ngân hàng.

### Nạp ví
- Khách nạp qua PayOS ở `/profile/payments`.
- Khi PayOS trả về trang return, FE gọi `POST /payments/wallet/topup/confirm`. BE hỏi lại PayOS rồi mới cộng tiền và ghi lịch sử `TOPUP`.
- Webhook vẫn dùng được. Một URL webhook của PayOS xử lý được cả đơn hàng lẫn nạp ví.

## 2. Tính năng và lỗi đã làm trong session

| # | Hạng mục | Kết quả |
|---|---|---|
| 1 | PayOS return/confirm (đơn hàng) | Webhook không gọi được vào localhost nên đơn kẹt. Thêm lấy trạng thái từ PayOS, endpoint `POST /payments/payos/confirm`, trang return gọi endpoint này. BE xác minh với PayOS, không tin tham số URL. Webhook và confirm dùng chung `markPayosPaid`. |
| 2 | Đổi sang cọc rồi trả nốt | Mô tả ở mục 1. Có migration, endpoint `pay-rental`, job hết hạn 24 giờ, các chốt chặn giao hàng. |
| 3 | Nạp ví không cộng tiền | Sửa theo mục 1, phần nạp ví (xem mục 3). |
| 4 | Lựa chọn trả bằng ví | Nút "Ví FlexTrip" luôn hiện ở cả bước cọc và bước trả nốt. Số dư thiếu thì khoá nút, báo "không đủ" và có link nạp thêm. |
| 5 | Mã đơn PayOS trùng | Đã sửa (xem mục 3). |
| 6 | Admin `/admin/05-transactions` | Việt hoá toàn bộ, thêm hướng dẫn "Tiền được chia như thế nào?". |
| 7 | Tab "Hoa hồng" (admin) | Thẻ tổng kết, thanh tỷ lệ chia, lọc theo staff và trạng thái, bảng chi tiết, cửa sổ chi tiết từng đơn, tổng hoa hồng từng staff. |
| 8 | Giải conflict, quản lý booking/staff | Giải 10 file conflict khi nhập develop, sửa lỗi biên dịch khi gộp (chủ yếu `payment.gateway`). |
| 9 | Seed admin | `npm run seed:admin` → `admin@flextrip.dev` / `Admin@123456`. |
| 10 | Tài liệu | `docs/db-diagrams/` (4 file SQL cho dbdiagram), `docs/Report5_FlexTrip_Test_Documentation.docx` (còn 3 chỗ chờ chèn hình thống kê). |

## 3. Bug đã phát hiện và sửa
- **Webhook không vào được localhost:** khiến đơn và ví kẹt. Đã sửa bằng cơ chế xác nhận từ trang return.
- **Trang return nạp ví không báo BE:** gây mất tiền nạp. Đã sửa.
- **Mã đơn PayOS trùng** (như mã `1`, `975`): lấy chữ số từ mã chữ-số nên va chạm. Đã đổi thành mốc thời gian cộng 3 số ngẫu nhiên.
- **Webhook đơn hàng và nạp ví tách đôi:** PayOS chỉ có một URL webhook. Đã gộp thành một cửa vào.

## 4. File thay đổi chính

### Schema
- `be/prisma/schema.prisma`: `Payment.rentalPaidAt`, `rentalGateway`, `rentalOrderCode`, `rentalTransId`; `Booking.balanceDueAt`.
- Migration `be/prisma/migrations/20261016000000_add_rental_balance_payment`, kèm câu `UPDATE` coi các payment cũ là đã trả đủ.

### BE (`be/src/modules/`)
- `payments/payments.service.ts`: cọc, `payRental`, `markRentalPaid`, nạp ví (`confirmTopupReturn`, `settleTopup`), webhook gộp.
- `payments/payments.controller.ts`: thêm `pay-rental` và `wallet/topup/confirm`.
- `payments/gateways/payos.gateway.ts`: mã đơn duy nhất, lấy trạng thái thanh toán.
- `payments/refund.service.ts`: hoàn theo số đã trả.
- `payments/commission.service.ts`: xác định escrow theo `rentalGateway`.
- `contracts/contracts.service.ts`: đặt hạn 24 giờ, tạo job hết hạn, chặn check-in khi chưa trả nốt.
- `booking/booking.service.ts`, `booking.processor.ts` (job `balance-expiry`, chặn auto-start), `booking.constants.ts`.
- `staff/staff-operations.service.ts`: chặn bàn giao khi chưa trả nốt.
- `admin/finance/*` (hoa hồng, giao dịch), `be/prisma/seed-admin.ts`.

### FE (`fe/src/`)
- `app/(main)/bookings/[id]/page.tsx`: luồng cọc, trả nốt, nút ví, khoá nút "Bắt đầu".
- `app/(main)/payment/return/page.tsx` và `payment/topup/return/page.tsx`.
- `hooks/usePayments.ts`, `lib/api/payments.ts`, `types/booking.ts`.
- Admin: `app/admin/05-transactions/page.tsx`, `_components/commissions-tab.tsx`, `types/admin.ts`, `lib/api/admin.ts`, `hooks/admin/use-admin-finance.ts`.

## 5. Kiểm thử

**Đã chạy thử trên DB thật**
- Ví: cọc, trả nốt, các chốt chặn giao hàng (bắt đầu, check-in, auto-start).
- Hết hạn: huỷ do hệ thống và hoàn cọc.
- PayOS (giả lập phản hồi): số tiền cọc 100.000 và tiền thuê 400.000 gửi sang PayOS đều đúng.
- Nạp ví: xác nhận một lần cộng một lần, người khác không xác nhận được, có lịch sử `TOPUP`.
- `tsc` của BE và FE sạch.

**Chưa kiểm chứng**
- Luồng PayOS thật từ đầu đến cuối.
- Job hết hạn tự chạy qua BullMQ (mới gọi trực tiếp hàm xử lý).
- Giao diện trên trình duyệt.
- `npm test` giữ nguyên 231 pass / 205 fail (do thiếu `TEST_DATABASE_URL`, không phải do thay đổi này).

## 6. Tồn đọng, cần quyết
1. **Chính sách quá hạn:** khách quá hạn vẫn được hoàn đủ cọc, nên có thể giữ chỗ miễn phí 24 giờ. Có muốn giữ một phần cọc làm phạt không?
2. **Số dư đóng băng có thể âm:** với đơn cọc bằng PayOS, bước hoàn cọc sau 72 giờ trừ vào số dư đóng băng trong ví, mà PayOS không hề đóng băng gì. Lỗi có từ trước.
3. **Hoàn tiền không về ngân hàng:** huỷ đơn trả bằng PayOS thì tiền chỉ về ví FlexTrip. Provider từ chối thì chỉ đổi trạng thái thanh toán sang "đã hoàn", chưa có tiền hoàn thật về ngân hàng.
4. **Hai đơn nạp ví bị ảnh hưởng:** mã `1` đã được cộng 10.000₫. Mã `975` PayOS báo chưa thanh toán, chờ xác nhận có chuyển khoản hay không.
5. **Restart BE** để nạp Prisma client mới và đăng ký job `balance-expiry`.
6. **Chưa commit:** toàn bộ thay đổi đang chưa commit.
