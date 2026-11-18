


# CONTRACT-LEGAL — Proposal: Hợp đồng thuê thiết bị theo mẫu pháp lý Việt Nam + ký tay bằng chuột

> **Trạng thái**: 📝 Draft — chờ xác nhận các quyết định ở mục 12 trước khi code
> **Phạm vi**: nâng cấp CONTR-01 → CONTR-05 (hợp đồng, ký, biên bản giao/nhận)
> **Mẫu tham chiếu**: `Downloads/hop-dong-thue-xe-o-to-tu-lai-5e4a8c.docx` (10 Điều + Phụ lục 1 + Phụ lục 2)
> **Nguyên tắc xuyên suốt**: *chỉ thêm, không phá* — không drop cột, không đổi hợp đồng đã ký, có công tắc tắt (feature flag).

---

## ✅ Quyết định đã chốt (ghi đè các mục tương ứng bên dưới)

1. **Không thu thập thêm hồ sơ pháp lý.** Chỉ in những thông tin dự án **đã có**. Thông tin nào không có thì **bỏ hẳn dòng đó**, không để dấu chấm, không ghi "chưa có". Vì vậy **bỏ**: form Hồ sơ pháp lý, cột mới trên `User/ProviderProfile`, các trường thiết bị mới trên `Listing`, việc chặn ký vì thiếu dữ liệu (mục 4.1, 4.2, 7.1 phần User/Listing, `LegalProfileForm`).
2. **Số liệu**: tiền đền bù/mức phạt lấy từ **bảng mức phạt Provider ghi trên sản phẩm**. Các con số khác mà hệ thống không có (phí trả trễ, trả sớm, gia hạn, % phạt vi phạm, báo trước chấm dứt…) **không viết vào hợp đồng**; các điều khoản đó bỏ hoặc chỉ nêu nguyên tắc, không nêu số (mục 4.3, D6).
3. **Admin là người rà soát** nội dung hợp đồng (D9). Nội dung đặt trong một file riêng, dễ sửa chữ.
4. Không cần quan tâm ngày review (D10).
5. Số CCCD chỉ in khi người dùng **đã được duyệt KYC**, và **chỉ in 4 số cuối** (hệ thống đã lưu sẵn, không cần giải mã).

---

## 0. Cần đọc trước (2 điều quan trọng)

1. **Code không thể tự bảo đảm "đúng pháp luật".** Tôi dùng mẫu của bạn làm khung, đổi các phần riêng của xe sang thiết bị và thêm phần đặc thù của FlexTrip (ví ký quỹ, nhân viên giao nhận). Nội dung điều khoản cuối cùng **nên được giảng viên pháp lý hoặc luật sư rà soát** trước ngày bảo vệ. Các căn cứ pháp luật ghi ở mục 2 là *dự kiến*, cần đối chiếu số điều.
2. **"Ký bằng quẹt chuột" là chữ ký điện tử dạng hình ảnh**, kèm bằng chứng kỹ thuật (thời điểm, mã băm nội dung, IP). Nó **không phải chữ ký số do tổ chức chứng thực cấp** (CA). Ta nói đúng điều này ở demo và trong hợp đồng, để không bị hỏi vặn (xem mục 6.4).

---

## 1. Hiện trạng (đã đọc code)

| Mảng | Hiện tại | Khoảng cách so với mẫu |
|---|---|---|
| Nội dung | `contracts.templates.ts` sinh **một chuỗi text** 9 mục (I–IX), hiển thị bằng `<pre>` chữ mono | Không có quốc hiệu, tiêu ngữ, số hợp đồng chuẩn, căn cứ pháp lý, địa điểm/ngày ký |
| Bên A / Bên B | Chỉ tên shop + tên provider, tên + email traveler | Thiếu CCCD/MST, ngày/nơi cấp, địa chỉ, SĐT, tài khoản ngân hàng, người đại diện |
| Đối tượng thuê | Tên, danh mục, địa điểm, số lượng | Thiếu hãng, model, số seri, năm sản xuất, màu, phụ kiện, giá trị thị trường (có ở `Listing.marketValue` nhưng chỉ in khi "giá trị cao") |
| Ký | Tick một ô checkbox ("Tôi đã đọc và đồng ý") ở `SignatureCheckbox.tsx`; provider ký ở `bookings/[id]/contract` | Không có chữ ký thấy được, không có mã băm nội dung |
| Phụ lục | Không có. Biên bản giao/nhận hiện lưu thành text trong `Booking.handoverCondition/returnCondition` (checklist ✓/✗ + ghi chú + ảnh) | Mẫu có Phụ lục 1 (giao) và 2 (nghiệm thu, thanh lý) |
| Vai trò FlexTrip | Chỉ một dòng "nền tảng trung gian" | Mẫu hai bên; FlexTrip có ví ký quỹ, Staff giao nhận, hòa giải: **cần điều khoản riêng** |
| Nơi dùng `terms` | `ContractViewer`, `printContract.ts`, trang Staff, trang Admin | Phải giữ tương thích |

Dữ liệu **đã có** để điền: tên, email, SĐT, địa chỉ, ngày sinh của `User`; `ProviderProfile.shopName/ownerName/pickupAddress/bankAccount`; `KycApplication` (họ tên pháp lý, số giấy tờ mã hoá AES-256-GCM, 4 số cuối, ảnh); `Booking` (ngày, số lượng, giá, cọc, hình thức nhận); `Listing` (giá, mức phạt, ghi chú tình trạng, giá trị thị trường).
Dữ liệu **chưa có**: ngày cấp/nơi cấp CCCD, MST, hãng/model/số seri/năm sản xuất/màu/phụ kiện của thiết bị, số hợp đồng theo dãy.

---

## 2. Căn cứ pháp lý dự kiến (cần rà soát)

| Văn bản | Dùng cho |
|---|---|
| Bộ luật Dân sự 2015 (91/2015/QH13): phần hợp đồng thuê tài sản (từ Điều 472), đặt cọc (Điều 328), phạt vi phạm (Điều 418) | Căn cứ chính. Mẫu của bạn cũng chỉ dẫn BLDS |
| Luật Giao dịch điện tử 2023 (20/2023/QH15, hiệu lực 01/07/2024) | Hợp đồng điện tử và chữ ký điện tử |
| Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân | Thu thập CCCD, địa chỉ: phải có đồng ý rõ ràng, che bớt khi hiển thị cho người không cần |
| Luật Bảo vệ quyền lợi người tiêu dùng 2023 (19/2023/QH15) | Nếu Provider là thương nhân và Traveler là người tiêu dùng: lưu ý điều khoản bất lợi, hợp đồng theo mẫu |
| Luật Thương mại 2005, mức trần phạt vi phạm | Chỉ liên quan nếu cả hai bên là thương nhân: **hỏi người có chuyên môn** mức phạt nào hợp lệ |

**Bỏ khỏi mẫu**: Luật Trật tự, an toàn giao thông đường bộ, giấy phép lái xe, nhiên liệu, số km, biển số, số khung/số máy, đăng kiểm, bảo hiểm trách nhiệm dân sự bắt buộc, phạt nguội. Đây đều chỉ liên quan tới xe.

---

## 3. Cấu trúc hợp đồng mới (ánh xạ từ mẫu)

Tên: **HỢP ĐỒNG THUÊ THIẾT BỊ**. Số: `NNNNNN/2026-HĐTB` (dãy số tăng dần theo năm, mục 7.1).

| Mẫu (xe) | FlexTrip (thiết bị) | Thay đổi chính |
|---|---|---|
| Quốc hiệu, tiêu ngữ, tên, số | Giữ nguyên | Số theo dãy, không dùng 12 ký tự cuối của id như hiện nay |
| Căn cứ | BLDS 2015, Luật Giao dịch điện tử 2023, nhu cầu và khả năng các bên | Bỏ luật giao thông |
| Ngày, tháng, năm, địa điểm | Ngày ký (tự động), địa điểm: "trên nền tảng FlexTrip" | Hợp đồng ký từ xa, không có địa điểm vật lý |
| Bên A (cho thuê) | Giữ: tên, địa chỉ, CCCD/MST, ngày/nơi cấp, đại diện, chức vụ, SĐT, email, **STK ngân hàng** | Tự điền từ hồ sơ Provider |
| Bên B (thuê) | Giữ các trường trên, **bỏ GPLX** | Tự điền từ hồ sơ Traveler |
| **Điều 1** Đối tượng | Thiết bị: tên, hãng, model, số seri, năm SX, màu, số lượng, giá trị thị trường, tình trạng do Provider khai, phụ kiện đi kèm. Cam kết sở hữu hợp pháp, không tranh chấp. Mục đích thuê, cấm cho thuê lại | Bỏ nhiên liệu/km/giấy tờ xe |
| **Điều 2** Thời hạn, giao nhận | Số ngày, ngày bắt đầu/kết thúc, hình thức nhận (lấy tại chỗ/giao tận nơi, địa chỉ), gia hạn, **trả trễ**, trả sớm | Giờ giao nhận do Staff và hai bên chốt (hệ thống đang lưu theo ngày) |
| **Điều 3** Giá, cọc, thanh toán | Đơn giá/ngày, tổng giá trị (kèm **bằng chữ**), cọc 30%, hoàn cọc, khấu trừ. Thanh toán: cọc khi ký, phần còn lại trong 24 giờ sau khi Provider xác nhận | Đổi "100% khi ký" thành cơ chế thực tế của FlexTrip |
| **Điều 4, 5** Quyền và nghĩa vụ | Giữ cấu trúc, đổi nội dung theo thiết bị | Bỏ các mục về lái xe, luật giao thông |
| **Điều 6** (mới) Vai trò FlexTrip | Ví ký quỹ giữ cọc; Staff giao/nhận và lập biên bản; hòa giải; FlexTrip **không phải bên** của hợp đồng thuê | Cần người có chuyên môn xem lại cách diễn đạt |
| **Điều 6 → 7** Sự cố, hư hỏng, mất mát | Thay "bảo hiểm, tai nạn" bằng: hư hỏng, mất mát, cách xác định giá trị thiết bị (theo giá thị trường, 2–3 nguồn), **bảng mức phạt** của Provider | Bảng mức phạt đã có ở `Listing.penaltyRules` |
| **Điều 7 → 8** Phạt vi phạm, bồi thường | Giữ nguyên tắc; điền % và số ngày bổ sung | Tỷ lệ cần bạn chốt (mục 12) |
| **Điều 8 → 9** Chấm dứt | Giữ; thêm chính sách **huỷ đơn/hoàn cọc** hiện có | Phải khớp với code, không viết tay |
| **Điều 9 → 10** Bất khả kháng | Giữ nguyên | |
| **Điều 10 → 11** Tranh chấp | Thương lượng → hòa giải FlexTrip → Toà án | Giữ cơ chế 3 cấp đang chạy |
| Điều khoản chung | Hiệu lực khi hai bên ký điện tử; **chữ ký điện tử và bằng chứng**; lưu trữ bản điện tử | Thêm đoạn nói rõ loại chữ ký (mục 6.4) |
| Chữ ký | Hai ô ký có **hình chữ ký, họ tên, thời điểm, mã xác thực** | |
| **Phụ lục 1** Biên bản bàn giao | **Tự sinh** từ biên bản Staff: 3 mục kiểm tra, ảnh, ghi chú, thời điểm, Staff phụ trách | Dùng dữ liệu đã có |
| **Phụ lục 2** Nghiệm thu, thanh lý | **Tự sinh** từ biên bản nhận lại, các khoản thanh toán, chia tiền, hoàn cọc | Dùng dữ liệu đã có |

---

## 4. Các chỗ trống trong mẫu: điền từ đâu

Quy tắc: **hợp đồng không được còn dòng chấm "......" khi ký.** Nếu thiếu dữ liệu bắt buộc, chặn ký và nói rõ thiếu gì.

### 4.1 Bên A, Bên B

| Trường | Nguồn | Có sẵn? |
|---|---|---|
| Họ tên / tên cửa hàng | `User.name`, `ProviderProfile.shopName/ownerName` | ✅ |
| Địa chỉ | Traveler: `User.address`. Provider: `ProviderProfile.pickupAddress` (cần địa chỉ thường trú riêng) | ⚠️ một phần |
| CCCD/MST, ngày cấp, nơi cấp | `KycApplication` có số (mã hoá), **không có ngày/nơi cấp** | ❌ cần thu thập |
| Người đại diện, chức vụ | Cá nhân: chính họ, chức vụ để trống hoặc "Cá nhân" | ⚠️ |
| SĐT, email | `User.phone`, `User.email` | ✅ (SĐT có thể trống) |
| STK ngân hàng (Bên A) | `ProviderProfile.bankAccount` | ⚠️ định dạng tự do |

→ **Đề xuất**: thêm "Hồ sơ pháp lý ký hợp đồng" (số giấy tờ, ngày cấp, nơi cấp, địa chỉ thường trú) lưu trên hồ sơ người dùng, **điền sẵn từ dữ liệu đã có**, người dùng chỉ bổ sung phần thiếu một lần, dùng lại cho các hợp đồng sau.

### 4.2 Thiết bị (Điều 1)

Thêm trên `Listing`: `brand`, `model`, `serialNumber`, `manufactureYear`, `color`, `accessories` (danh sách phụ kiện). Dùng sẵn `marketValue`, `conditionNote`, `quantity`.
- **Bắt buộc khi đăng**: hãng, model, phụ kiện đi kèm, tình trạng.
- **Tuỳ chọn**: số seri, năm SX, màu. Nếu trống, hợp đồng in "Không có / Không xác định", không in dấu chấm.

### 4.3 Thông số kinh doanh (điền sẵn mặc định, bạn xác nhận ở mục 12)

Gia hạn báo trước bao nhiêu giờ; phí trả trễ; khi nào tính thêm một ngày; trả sớm; % phạt vi phạm; số ngày bù khoản thiếu; báo trước khi đơn phương chấm dứt; hạn khấu trừ cọc (mẫu: 3 ngày làm việc). Lưu thành **một file hằng số duy nhất** (`contract.constants.ts`) để hợp đồng và code nghiệp vụ không lệch nhau.

---

## 5. Thiết kế nội dung hợp đồng (giảm rủi ro cho nơi đang dùng `terms`)

Hiện có 4 nơi đọc `contract.terms` (ContractViewer, printContract, trang Staff, trang Admin). Để không vỡ:

1. Viết **một hàm dựng tài liệu** `buildContractDocument(params)` trả về **cấu trúc** (danh sách mục, đoạn, bảng).
2. Từ cùng cấu trúc đó, sinh **hai đầu ra**:
   - `content` (JSON) cho trình xem mới: kiểu chữ chuẩn văn bản, đánh số điều, bảng, khối chữ ký.
   - `terms` (text thuần) giữ nguyên cột cũ → các nơi cũ vẫn chạy.
3. Hợp đồng **cũ** (không có `content`) tiếp tục hiển thị bằng `<pre>` như hiện tại. **Không viết lại hợp đồng đã ký.**
4. In/PDF: dùng khổ A4, CSS in; cập nhật `printContract.ts` đọc từ `content`.

---

## 6. Chữ ký tay bằng chuột

### 6.1 Trải nghiệm

- Một **ô vẽ** (canvas) hiện khi bấm "Ký": vẽ bằng chuột hoặc ngón tay. Có nút **Xoá/Ký lại**.
- Chỉ bật "Xác nhận ký" khi đã có nét vẽ (đủ số điểm tối thiểu, tránh một chấm).
- Traveler ký ở bước 2 của đặt thuê (thay ô checkbox); Provider ký ở trang xác nhận đơn.
- Sau khi ký: hình chữ ký, họ tên, thời điểm hiện trong khối chữ ký của hợp đồng.
- **Không tái dùng chữ ký đã lưu** ở bản đầu: mỗi hợp đồng ký mới. (Có thể thêm sau.)

### 6.2 Cách làm (không thêm thư viện)

Một component `SignaturePad` bằng canvas + sự kiện pointer (chuột và cảm ứng), khoảng 100 dòng. Lý do không dùng `signature_pad`: tránh phụ thuộc mới ngay trước ngày review; nếu muốn nét mượt hơn có thể đổi sau.
Xuất ảnh PNG thu nhỏ (~600×200), gửi lên dạng `data:image/png;base64`.

### 6.3 Lưu trữ và bằng chứng (mỗi bên)

| Trường | Ý nghĩa |
|---|---|
| `signatureImage` | Ảnh chữ ký (text base64 trong DB, giới hạn ~100KB, kiểm tra định dạng PNG) |
| `signedAt` | Giờ máy chủ (không tin giờ trình duyệt) |
| `signedContentHash` | SHA-256 của nội dung hợp đồng tại lúc ký |
| `signedIp`, `signedUserAgent` | Dấu vết |
| `signedUserId` | Tài khoản đã đăng nhập khi ký |

Khi **Provider ký**, server tính lại mã băm và **so với mã băm Traveler đã ký**. Khác nhau thì từ chối. Điều này chứng minh hai bên ký **cùng một nội dung**.

### 6.4 Giới hạn nói thật

Chữ ký hình ảnh kèm thời điểm, mã băm và tài khoản đăng nhập là **bằng chứng thoả thuận** mạnh hơn checkbox hiện tại. Nó vẫn **không thay thế chữ ký số có chứng thư**. Việc nâng lên chữ ký số, hoặc xác thực OTP khi ký, ghi là hướng phát triển. Khi hội đồng hỏi: trả lời theo đúng mục này.

---

## 7. Thay đổi kỹ thuật

### 7.1 Database (chỉ thêm, qua `npx prisma migrate dev`)

```
Contract (thêm, đều nullable/có default):
  contractNo            String?  @unique     // 000123/2026-HĐTB
  templateVersion       Int      @default(1) // 1 = cũ (text), 2 = theo mẫu pháp lý
  content               Json?                // cấu trúc hợp đồng v2
  contentHash           String?
  travelerSignature     Json?                // {image, signedAt, hash, ip, ua}
  providerSignature     Json?
  partySnapshot         Json?                // thông tin Bên A/B đã đóng băng lúc ký

User / ProviderProfile (thêm):
  legalIdNumber? legalIdIssuedAt? legalIdIssuedPlace? permanentAddress? taxCode?

Listing (thêm): brand?, model?, serialNumber?, manufactureYear?, color?, accessories String[]

ContractCounter (mới): year Int @id, last Int   // cấp số nguyên tử, tránh trùng số
```

- Không drop, không đổi tên cột cũ. `travelerSignedAt/providerSignedAt/terms` vẫn được ghi như cũ.
- CCCD lưu **mã hoá** (tái dùng cơ chế AES-256-GCM của `kyc.service.ts`); bản trong hợp đồng hiển thị đủ cho hai bên, **che giữa** khi xem bởi Staff/Admin/AI (quyết định D7).

### 7.2 Backend (`be/src/modules/contracts/`)

| File | Việc |
|---|---|
| `contract.constants.ts` (mới) | Mọi con số mặc định (mục 4.3) |
| `contracts.document.ts` (mới) | `buildContractDocument` → `content` + `terms` |
| `vietnamese-number.util.ts` (mới) | Số → chữ ("Bằng chữ"); **có bộ test riêng** |
| `contracts.service.ts` | `generate()` dựng v2 khi bật cờ; `travelerSign/providerSign` nhận chữ ký, kiểm tra, so mã băm |
| `contract.dto.ts` | DTO ký: `signatureImage`, kiểm tra định dạng và kích thước |
| Cấp số hợp đồng | Trong cùng transaction với tạo hợp đồng |
| Hồ sơ pháp lý | Endpoint đọc/ghi + kiểm tra định dạng (CCCD 12 số, SĐT…) |
| Chặn ký | Thiếu dữ liệu bắt buộc → lỗi rõ ràng, nêu trường thiếu |

### 7.3 Frontend

| File | Việc |
|---|---|
| `components/contracts/SignaturePad.tsx` (mới) | Ô vẽ chữ ký |
| `components/contracts/ContractDocument.tsx` (mới) | Trình xem v2 (kiểu văn bản) |
| `components/contracts/LegalProfileForm.tsx` (mới) | Form hồ sơ pháp lý, điền sẵn |
| `bookings/new/page.tsx` (bước 2) | Thay checkbox bằng: kiểm tra hồ sơ → xem hợp đồng → ký |
| `bookings/[id]/contract/page.tsx` | Provider ký bằng chữ ký |
| `listing-form.tsx` | Thêm hãng/model/số seri/năm SX/màu/phụ kiện |
| `lib/printContract.ts` | In từ `content` (A4) |
| Trang Staff/Admin | Hiện Phụ lục 1, 2 dưới hợp đồng |

### 7.4 Phụ lục

- **Phụ lục 1** sinh từ `Booking.handoverCondition`, ảnh bàn giao, Staff phụ trách, `checkedInAt`.
- **Phụ lục 2** sinh từ `returnCondition`, `checkedOutAt`, số tiền thanh toán, tiền hoàn cọc, phạt (nếu có).
- Chỉ **hiển thị**, không cần ký thêm ở bản đầu (Staff đã xác nhận trong hệ thống).

---

## 8. Luồng sau khi sửa

```
Traveler: chọn ngày → Đặt thuê
  Bước 1  Tóm tắt giá
  Bước 2  [nếu thiếu] điền Hồ sơ pháp lý  →  xem hợp đồng (Bên A, Bên B, thiết bị, giá, mức phạt đã điền)
          →  VẼ CHỮ KÝ  →  Xác nhận ký       (server: tạo hợp đồng, cấp số, lưu hash + chữ ký)
  Bước 3  Thanh toán cọc 30% (ví / PayOS)       → booking PENDING_APPROVAL

Provider: xem đơn → xem hợp đồng → VẼ CHỮ KÝ → Ký & xác nhận
          (server: so hash; khớp mới ký; booking CONFIRMED)

Giao/nhận: Staff như hiện tại  →  Phụ lục 1 và 2 tự hiện trong hợp đồng
```

Provider cần có Hồ sơ pháp lý **trước khi** hợp đồng được tạo (vì Bên A nằm trong nội dung Traveler ký). Xem D4 ở mục 12.

---

## 9. Rủi ro và cách giảm

| Rủi ro | Cách giảm |
|---|---|
| Làm hỏng luồng đặt/ký đang chạy ngay trước review | **Feature flag** `CONTRACT_V2`; tắt = chạy y như cũ. Merge khi cờ tắt, bật ở môi trường demo sau khi test |
| Hợp đồng cũ bị đổi | Chỉ tạo v2 cho hợp đồng **mới**; cũ giữ `<pre>` |
| Còn dòng chấm hoặc `undefined` trong hợp đồng | Test: hợp đồng sinh ra **không chứa** `....`, `undefined`, `null`, `NaN` |
| Số và chữ không khớp ("Bằng chữ") | Bộ test cho 0, 1, 5, 10, 11, 15, 21, 100, 105, 1.000, 1.500.000, 10.000.000… |
| Con số lệch với tiền thực tế | Hợp đồng lấy số từ `Booking/Payment` và `contract.constants.ts`; test đối chiếu |
| Hai bên ký hai bản khác nhau | So `contentHash` khi Provider ký |
| Lộ CCCD | Mã hoá khi lưu; che khi hiển thị cho người không phải hai bên; không đưa CCCD vào prompt AI |
| Chữ ký rỗng/độc hại | Kiểm tra định dạng PNG, kích thước, số nét ở cả FE và BE |
| Provider chưa có hồ sơ pháp lý → không đặt được | Điền sẵn từ dữ liệu có; tài khoản demo được nạp sẵn; thông báo thiếu gì |
| Pháp lý chưa chuẩn | Rà soát bởi người có chuyên môn; nội dung tách khỏi code để sửa chữ nhanh |
| Số hợp đồng trùng khi đặt đồng thời | Bảng `ContractCounter` cập nhật nguyên tử trong transaction |

---

## 10. Kiểm thử và nghiệm thu

**Tự động (BE)**: dựng hợp đồng đủ dữ liệu và không còn chỗ trống; số/chữ; đúng tiền; ký Traveler rồi Provider khớp hash; Provider ký sau khi nội dung bị đổi bị từ chối; ảnh chữ ký sai bị từ chối; cấp số không trùng khi chạy song song; hợp đồng cũ vẫn đọc được; quyền xem (người ngoài không đọc được).
**Tự động (FE)**: SignaturePad (không nét → nút tắt; có nét → bật; xoá), form hồ sơ pháp lý.
**Chạy tay trên trình duyệt** (tôi chạy bằng Playwright như lần chụp màn hình): luồng đầy đủ Traveler → Provider → Admin gán Staff → giao → nhận; in PDF; xem trên điện thoại.
**Checklist nghiệm thu**: mọi trường của mẫu đều có giá trị; số hợp đồng đúng dạng; chữ ký hiện đúng chỗ; hợp đồng cũ không đổi; cờ tắt thì như cũ; tài khoản demo đặt được từ đầu tới cuối.

---

## 11. Giai đoạn và thứ tự ưu tiên

Dành cho thời gian gấp: làm theo **P0 → P1 → P2**, mỗi giai đoạn dừng được mà hệ thống vẫn chạy.

| Giai đoạn | Nội dung | Ghi chú |
|---|---|---|
| **P0 — Nền** | Migration (chỉ thêm), `contract.constants.ts`, số → chữ + test, `buildContractDocument` (v2), cấp số hợp đồng, cờ `CONTRACT_V2` | Chưa đổi gì người dùng thấy |
| **P1 — Lõi** | Hồ sơ pháp lý, trường thiết bị trên Listing, trình xem hợp đồng v2, **SignaturePad + ký + so hash** cho cả hai bên, in A4 | Đây là phần hội đồng thấy |
| **P2 — Hoàn thiện** | Phụ lục 1 và 2 tự sinh, che CCCD cho Staff/Admin, cập nhật kịch bản demo và ảnh chụp | Nếu hết giờ có thể bỏ, hợp đồng vẫn đầy đủ |
| **Sau review** | Tái dùng chữ ký đã lưu, OTP khi ký, chữ ký số có chứng thư, PDF phía server | Ngoài phạm vi |

Tôi sẽ không báo "xong" khi chưa chạy kiểm thử và luồng thật cho từng giai đoạn.

---

## 12. Quyết định cần bạn xác nhận (kèm mặc định tôi đề xuất)

| # | Câu hỏi | Mặc định đề xuất |
|---|---|---|
| D1 | Tên và số hợp đồng | "HỢP ĐỒNG THUÊ THIẾT BỊ", `NNNNNN/2026-HĐTB` |
| D2 | Ký bằng chữ ký vẽ tay (hình ảnh) và nói rõ không phải chữ ký số CA | Có |
| D3 | Phụ lục 1 và 2 tự sinh, chỉ hiển thị, không ký riêng | Có |
| D4 | Provider **thiếu** hồ sơ pháp lý thì: (a) chặn đặt thuê sản phẩm của họ, hay (b) cho đăng nhưng bắt bổ sung trước khi duyệt đơn? | (a) cho sản phẩm **mới**, nạp sẵn cho tài khoản demo |
| D5 | Trường thiết bị bắt buộc: hãng, model, phụ kiện, tình trạng; tuỳ chọn: số seri, năm, màu | Như bên |
| D6 | Thông số kinh doanh: trả trễ (mẫu hiện tại: 150% đơn giá/ngày), trả sớm, gia hạn, % phạt vi phạm, báo trước chấm dứt, hạn khấu trừ cọc | Giữ **150%/ngày** cho trễ; **bạn chốt** các số còn lại (mục 4.3) |
| D7 | CCCD hiển thị: đủ cho hai bên, che cho Staff/Admin/AI | Có |
| D8 | Tạm bỏ qua tái dùng chữ ký, OTP khi ký, PDF server | Có |
| D9 | Ai rà soát nội dung pháp lý trước ngày bảo vệ (giảng viên, luật sư)? | Bạn quyết |
| D10 | Hạn chót (ngày review) để tôi chia P0/P1/P2 cho vừa | Bạn cho biết ngày |

---

## 13. Việc **không** làm trong đề xuất này

Không đổi quy tắc huỷ đơn, hoàn tiền, chia hoa hồng, luồng giao nhận của Staff; không đổi hợp đồng đã ký; không tích hợp chữ ký số CA; không cam kết giá trị pháp lý tuyệt đối của nội dung hợp đồng.
