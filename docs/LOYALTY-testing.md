# LOYALTY — Hướng dẫn test

Test tay theo thứ tự, vì phần sau dùng dữ liệu của phần trước. Cách đẩy booking tới COMPLETED nhanh nhất: xem `docs/testing-booking-flows.md`.

> Trạng thái: các bước dưới chưa được chạy thử trên server thật. Unit test (mục 6) chỉ dùng mock.

## 0. Chuẩn bị
1. Chạy migration rồi restart BE:
   ```
   cd be && nvm use 20 && npx prisma migrate dev --name add_referrals_and_provider_incentives
   ```
2. `cd be && npm run seed:loyalty` — thêm 2 mốc đổi thưởng mẫu (10 điểm → 20k, 30 điểm → 70k) nếu bảng còn trống.
3. Chuẩn bị 3 tài khoản: **Admin**, **Provider** (có listing, ví), **Traveler A** (ví đã nạp tiền).
4. Vào `/admin/16-promo-budgets`:
   - Ngân sách "Đổi điểm thưởng" và "Thưởng giới thiệu" tự tạo với số dư 0 ở lần đổi điểm / lần cấp thưởng đầu tiên. Nạp tiền cho chúng.
   - Tạo thêm một ngân sách thường có tiền để test voucher admin.

## 1. Voucher (LOYALTY-04)
1. **Admin** vào `/admin/15-vouchers`, tạo mã `TEST20K` (giảm cố định 20.000 ₫, công khai, đang bật), gắn ngân sách đã nạp.
2. **Traveler A** thêm listing vào giỏ, nhập `TEST20K` ở từng dòng, checkout. Kiểm tra: giảm đúng 20.000 ₫, tổng giá gốc không đổi.
3. **Provider** duyệt booking, **Traveler** trả nốt bằng ví. Kiểm tra:
   - Tiền trả nốt thấp hơn 20.000 ₫, trang booking hiện dòng giảm giá.
   - Ngân sách: "đang giữ" chuyển thành "đã chi".
   - Voucher chuyển sang đã dùng ở `/profile/vouchers`.
4. **Hoàn thành booking**, kiểm tra ví provider và bảng `CommissionLedger` (Prisma Studio):
   - Provider nhận đúng 90% **giá gốc** (không phải 90% giá sau giảm).
   - `platformFee` = 10% giá gốc.
   - Số dư escrow không âm.
5. **Huỷ đơn** (mỗi trường hợp dùng voucher mới):
   - Provider từ chối: voucher về chưa dùng, ngân sách được hoàn.
   - Traveler huỷ trước / sau khi trả nốt: đối chiếu bảng quy tắc trong `VouchersService.onBookingCancelled`.
6. **Lỗi cần báo rõ:** mã hết hạn, đơn dưới mức tối thiểu, mã cá nhân của người khác, ngân sách cạn.

## 2. Điểm thưởng (LOYALTY-01)
1. Hoàn thành một booking của Traveler A → `/profile/loyalty`: +1 điểm, có dòng lịch sử, có thông báo.
2. Ở Cấu hình admin đổi `loyalty_points_per_order` = 10, hoàn thành thêm một booking → +10 điểm.
3. Bấm "Đổi" ở mốc 10 điểm, xác nhận:
   - Điểm bị trừ, voucher `LP-…` xuất hiện ở `/profile/vouchers`.
   - Ngân sách "Đổi điểm thưởng" tăng phần đang giữ khi voucher được dùng.
4. **Lỗi:** không đủ điểm thì nút bị khoá; ngân sách số dư 0 thì báo "Quỹ đổi thưởng tạm hết".
5. Gọi hai lần `POST /loyalty/redeem` cùng lúc khi chỉ đủ điểm cho một lần → chỉ một lần thành công.

## 3. Giới thiệu (LOYALTY-02)
1. **Traveler A** vào `/profile/referral`, sao chép liên kết `…/register?ref=MÃ`.
2. Cửa sổ ẩn danh, dán link: ô mã tự điền. Đăng ký **Traveler B** bằng email khác hộp thư, số điện thoại khác.
3. Chưa xác minh OTP: B chưa có voucher. Xác minh xong: B có voucher chào mừng 20.000 ₫ + thông báo.
4. B đặt đơn và hoàn thành → A nhận voucher 10.000 ₫, trạng thái "Đã nhận thưởng". Đơn thứ hai của B không thưởng thêm.
5. **Gian lận** (admin xem `/admin/18-referrals`, lọc REJECTED):
   - Cùng số điện thoại với A → `SAME_PHONE`.
   - `a+1@gmail.com` khi A là `a@gmail.com` → `SAME_EMAIL`.
   - Phía A chỉ thấy "Chờ đơn đầu tiên", không thấy lý do.
6. Đặt `referral_monthly_cap` = 1, giới thiệu người thứ hai và hoàn thành đơn → REJECTED (`CAP_REACHED`).

## 4. Top-rated (LOYALTY-03)
1. Provider cần huy hiệu "Provider uy tín" (đủ đơn hoàn thành, review, sao theo ngưỡng cấu hình).
2. Admin vào `/admin/17-loyalty`, bấm **Tính lại ngay**:
   - Provider xuất hiện trong bảng top-rated nếu đạt ngưỡng (mặc định 80).
   - Provider vào `/dashboard/incentives` thấy điểm, từng chỉ số, lời giải thích.
3. Hoàn thành một đơn của provider đó, mở `CommissionLedger`:
   - `platformRate` = 0.08 (không staff), `incentiveDiscountPct` = 2, `providerNet` = 92% giá.
4. Nâng `top_rated_min_score` lên 100, tính lại → nhận thông báo "Ưu đãi đã kết thúc", đơn mới trở về phí 10%.
5. Lời giải thích do AI viết cần `GROQ_API_KEY` trong `be/.env`; không có key thì dùng câu mẫu, kết quả top-rated không đổi.

## 5. Hết hạn (Phase 5)
Job `loyalty-maintenance` chạy 04:00, hiện chưa có nút chạy tay. Cách kiểm tra:
- Prisma Studio: đặt `expiresAt` của một `LoyaltyTransaction` kiểu EARN về quá khứ, rồi chờ 04:00 hoặc gọi `LoyaltyMaintenanceService.runNightly()` từ script tạm. Kỳ vọng: điểm bị trừ, có dòng EXPIRE + thông báo; chạy lại không trừ thêm.
- Đặt `endsAt` của một voucher cá nhân còn 2 ngày → nhận thông báo "sắp hết hạn" đúng một lần.

## 6. Test tự động (không cần DB)
```
cd be && nvm use 20
npm test -- src/modules/vouchers src/modules/loyalty src/modules/referrals src/modules/provider-incentives src/modules/payments
```
Hiện 79 test, đều dùng mock; không thay thế được các bước 1–5, nhất là phần tiền và escrow.
