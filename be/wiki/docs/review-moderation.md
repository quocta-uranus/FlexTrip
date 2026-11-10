---
title: Đánh giá và kiểm duyệt AI
description: Luồng nghiệp vụ REVIEW-01..04, quy tắc kiểm duyệt, khiếu nại, báo cáo và các tham số cấu hình.
category: API
order: 5
---

# Đánh giá và kiểm duyệt AI

Module `reviews` (kèm `admin/reviews`). Mọi đường dẫn có tiền tố `/api/v1`.

## 1. Vòng đời của một đánh giá

| Trạng thái | Ý nghĩa | Hiển thị công khai |
|---|---|---|
| `PENDING` | Chỉ còn xuất hiện khi admin yêu cầu AI phân tích lại | Không |
| `FLAGGED` | Bị rule hoặc AI gắn cờ vi phạm rõ, hoặc đang chờ admin xem khiếu nại | Không |
| `PUBLISHED` | Đã đăng. Review sạch được đăng ngay, AI kiểm tra sau (`moderatedAt` rỗng nghĩa là chưa kiểm tra) | Có, tính vào điểm trung bình của provider |
| `REJECTED` | Admin từ chối | Chỉ traveler và admin thấy |

Mô hình "đăng ngay, kiểm duyệt sau" như các sàn thương mại điện tử: review đã gắn với booking thật nên mặc định tin cậy,
chỉ vi phạm rõ mới bị ẩn, còn tín hiệu mềm chỉ gắn nhãn cho admin xem sau.

```
Traveler gửi ──> rule ──vi phạm──> FLAGGED
                  │
                  └─ sạch ──> PUBLISHED ngay ──AI (Groq) chạy sau──> giữ PUBLISHED
                                  │                                   (tín hiệu mềm: gắn nhãn cho admin)
                                  │            ──vi phạm cứng──> FLAGGED (rút khỏi điểm trung bình, báo traveler)
                                  └─ AI lỗi hết lượt / kẹt > 60 phút ──> giữ PUBLISHED (fail-open)
FLAGGED ──admin duyệt──> PUBLISHED        FLAGGED / PUBLISHED ──admin từ chối──> REJECTED
REJECTED ──traveler khiếu nại (1 lần)──> FLAGGED        PUBLISHED / FLAGGED / REJECTED ──traveler sửa (1 lần)──> rule lại, rồi như trên
```

## 2. Use case

### REVIEW-01: Traveler đánh giá

- `POST /reviews` với `{ bookingId, rating 1..5, comment 10..2000 ký tự }`.
- Điều kiện: booking của chính traveler, trạng thái `COMPLETED`, chưa có đánh giá, còn trong hạn
  (`review_window_days` ngày sau ngày kết thúc thuê, mặc định 30). Quá hạn trả `REVIEW_WINDOW_EXPIRED`.
- Rule chạy ngay trong lúc gửi. Vi phạm thì lưu `FLAGGED` và thông báo cho traveler. Ngược lại review được `PUBLISHED` ngay
  (điểm trung bình của provider cập nhật luôn) rồi mới đưa vào hàng đợi AI. Traveler không nhận thông báo "đã công khai".
- Sau 3 ngày kể từ ngày kết thúc thuê mà chưa đánh giá, hệ thống gửi đúng một thông báo nhắc.
- `PATCH /reviews/:id` (sửa một lần): trong `review_edit_hours` giờ (mặc định 48) kể từ lúc đăng. Với đánh giá bị từ chối,
  thời hạn tính từ lúc bị từ chối. Nội dung mới chạy lại rule: vi phạm thì `FLAGGED`, sạch thì `PUBLISHED` và AI kiểm tra lại
  sau; điểm trung bình của provider được tính lại theo số sao mới.
  Các lỗi: `REVIEW_ALREADY_EDITED`, `REVIEW_NOT_EDITABLE`, `REVIEW_EDIT_WINDOW_EXPIRED`.
- `GET /reviews/mine` trả thêm `canEdit` và `canAppeal` để giao diện biết khi nào hiện nút.
- `GET /reviews/policy` trả `reviewWindowDays` và `reviewEditHours` đang cấu hình để giao diện hiển thị đúng hạn đánh giá.

### REVIEW-02: Provider phản hồi và báo cáo

- `PUT /reviews/:id/response`: chỉ với đánh giá `PUBLISHED` dành cho mình. Nội dung đi qua rule và AI (AI lỗi thì vẫn
  cho đăng nếu rule đã qua). Sau lần phản hồi đầu, được sửa tối đa 2 lần (`RESPONSE_EDIT_LIMIT`).
- `POST /reviews/:id/report` với `{ reason: FAKE_REVIEW | OFFENSIVE | SPAM | OTHER, details? }`. `details` bắt buộc khi
  `OTHER`. Mỗi provider báo cáo một đánh giá một lần, tối đa 10 báo cáo mỗi ngày. Đánh giá vẫn công khai cho đến khi admin quyết định.
- `GET /reviews/received` trả thêm `responseEditsLeft` và `myReport` (trạng thái báo cáo của chính provider).

### REVIEW-03: Kiểm duyệt

- Hàng đợi BullMQ `review-moderation`, tối đa 3 lần thử, giới hạn 25 job mỗi phút. Khi Groq trả 429 thì cả worker tạm dừng
  theo thời gian Groq yêu cầu (không giữ job bằng `setTimeout`).
- Điểm cuối cùng của mỗi loại là giá trị lớn nhất giữa rule và AI. Đánh giá bị **ẩn** (`FLAGGED`) chỉ khi vi phạm rõ:
  `spamScore` hoặc `toxicityScore` đạt ngưỡng (`review_spam_threshold`, `review_toxicity_threshold`, mặc định 70), rule
  phát hiện vi phạm, hoặc nội dung từ 20 ký tự trở lên trùng với đánh giá khác (không phân biệt hoa thường). Khi một
  review đang công khai bị ẩn, điểm trung bình của provider được tính lại và traveler nhận đúng một thông báo.
- `suspicionScore` (AI nghi ngờ, hoặc 80 khi có tín hiệu mềm bên dưới) **không** ẩn review. Review vẫn công khai, admin
  lọc "Đã đăng, cần xem lại" (`suspicious=true`: `PUBLISHED`, `suspicionScore` đạt `review_suspicion_threshold`, chưa do
  admin quyết định) để xem; admin bấm "Giữ nguyên" (APPROVE) để bỏ khỏi danh sách hoặc "Từ chối" để gỡ. Tín hiệu mềm:
  - số sao mâu thuẫn với cảm xúc của nội dung (4–5 sao nhưng tiêu cực, hoặc 1–2 sao nhưng tích cực);
  - một tài khoản gửi từ 4 đánh giá trong 24 giờ;
  - một provider nhận từ 5 đánh giá trong 1 giờ.
- Rule (`review-moderation.rules.ts`, từ điển ở `review-moderation.lexicon.ts`) khớp theo **nguyên từ**, không khớp chuỗi con,
  và chạy cho cả review lẫn phản hồi của provider. Các nhóm:
  - tục tĩu, tiếng Việt và tiếng Anh, có dấu và không dấu (`dit me`, `dcm`, `vcl`);
  - xúc phạm cá nhân ("đồ ngu", "ngu dốt", "thằng chó", "mất dạy", "idiot"...), lý do hiện là "ngôn từ công kích";
  - đe dọa ("giết mày", "đốt shop"...). Không dùng động từ đơn như "giết" hay "đập chết" vì "giết thời gian", "đập chết muỗi";
  - số điện thoại Việt Nam và liên kết liên hệ hoặc rút gọn (`zalo.me`, `t.me`, `wa.me`, `bit.ly`), tính là spam để chặn việc
    kéo khách ra ngoài nền tảng. Nhắc "nhắn qua zalo" không bị tính.
  - Chống lách: ký tự thay thế (`d1t m3`), chữ Cyrillic giống chữ Latin, ký tự vô hình, chữ kéo dài (`đụụụ`), chèn dấu chấm hoặc
    khoảng trắng giữa các chữ (`c ặ c`).
  - **Admin chỉnh từ điển ngay trên web** tại `/admin/reviews/terms` (có hiệu lực ngay, tự làm mới sau tối đa 60 giây trên các
    instance khác): thêm từ mới theo nhóm, xóa từ đã thêm, tắt hoặc bật lại một từ có sẵn khi nó bắt nhầm, và "Thử một câu"
    để xem câu đó có bị giữ không mà không lưu gì. Dữ liệu ở bảng `ModerationTerm`, mọi thay đổi ghi audit log
    (`MODERATION_TERM_*`). Từ mới bị từ chối nếu ngắn hơn 3 ký tự, trùng từ đã có, chứa ký tự lạ, hoặc chặn nhầm một câu mẫu
    về thuê đồ (`SAFE_PHRASES`).
  - Mọi từ có sẵn trong mã nguồn phải kiểm tra với từ vựng thuê đồ: "đồ ngủ", "thang", "đồ cho thuê", "đồ điện" không được bị bắt nhầm. Từ
    không dấu chỉ được thêm khi không trùng từ thường (không thêm `lon`, `cac`, `deo`, `buoi`).
- Job quét mỗi 5 phút: đánh giá chờ AI (`PENDING`, hoặc `PUBLISHED` chưa có `moderatedAt`) quá 15 phút mà không có job thì
  được gửi lại. Job thất bại hết lượt hoặc kẹt quá 60 phút: `PENDING` chuyển `FLAGGED` kèm lý do "AI không khả dụng" để
  admin duyệt tay (traveler được thông báo); `PUBLISHED` giữ nguyên công khai (fail-open, rule đã chạy lúc gửi) và được
  đánh dấu đã xử lý để không bị quét lại.
- **Hạn xử lý (SLA):** review bị ẩn (`FLAGGED`) được tính chờ từ lúc traveler khiếu nại, nếu không thì từ lúc bị ẩn. Quá
  `review_sla_hours` giờ (mặc định 24) thì bị đánh dấu "Quá hạn xử lý" và vào nhóm "Quá hạn". Hệ thống chỉ đánh dấu, không tự duyệt.
- Admin:
  - `GET /admin/reviews?status&rating&search&appealed&reported&suspicious&overdue&sort&page&limit`
    (mỗi review có thêm `suspiciousPublic` theo ngưỡng `review_suspicion_threshold`, và với review đang bị ẩn có thêm
    `waitingSince`, `slaDueAt`, `overdue`; `sort=oldest` đưa review chờ lâu nhất lên đầu)
  - `GET /admin/reviews/summary` trả số review theo từng nhóm (`flagged`, `overdue`, `appealed`, `reported`, `suspicious`),
    mỗi số dùng đúng luật của bộ lọc tương ứng; giao diện dùng cho các nút lọc nhanh.
  - `POST /admin/reviews/bulk-moderate` với `{ ids (1..50, không trùng), decision, note }`: mỗi review xử lý trong giao dịch
    riêng như `moderate`, trả `{ succeeded, failed: [{ id, code, message }] }` nên một review lỗi không chặn các review còn lại.
    Ghi audit log và gửi thông báo từng review.
  - `GET/POST /admin/moderation-terms`, `DELETE /admin/moderation-terms/:id`, `PUT /admin/moderation-terms/built-in`,
    `POST /admin/moderation-terms/test`
  - `PATCH /admin/reviews/:id/moderate` với `{ decision: APPROVE | REJECT, note }` (`note` bắt buộc khi từ chối). APPROVE áp dụng
    được cho cả review đang công khai (để bỏ khỏi danh sách cần xem lại). Từ chối đánh
    giá sẽ tự chấp nhận mọi báo cáo đang mở và thông báo cho provider.
  - `PATCH /admin/reviews/:id/dismiss-reports` bỏ qua báo cáo và giữ nguyên đánh giá.
  - `POST /admin/reviews/:id/reanalyze` yêu cầu AI phân tích lại.
  - Mọi thao tác đều ghi audit log.
- Khiếu nại: `POST /reviews/:id/appeal` với `{ reason 10..1000 ký tự }`. Chỉ đánh giá `REJECTED`, một lần, trong 7 ngày kể
  từ khi bị từ chối. Đánh giá chuyển `FLAGGED` kèm lý do khiếu nại để admin xem. Các lỗi: `REVIEW_NOT_APPEALABLE`,
  `REVIEW_ALREADY_APPEALED`, `REVIEW_APPEAL_WINDOW_EXPIRED`.

### REVIEW-04: Phân tích cảm xúc

`GET /reviews/sentiment?range=30|90|365` (provider, hoặc admin kèm `providerId`) trả tỷ lệ tích cực, trung lập, tiêu cực
và xu hướng theo ngày, tuần hoặc tháng, chỉ trên các đánh giá đã công khai và đã được AI phân tích.

## 3. Tham số cấu hình (admin chỉnh được)

| Khóa | Mặc định | Ý nghĩa |
|---|---|---|
| `review_spam_threshold` | 70 | Ngưỡng spam |
| `review_toxicity_threshold` | 70 | Ngưỡng độc hại |
| `review_suspicion_threshold` | 70 | Ngưỡng đưa review đã đăng vào danh sách "cần xem lại" (không ẩn review) |
| `review_window_days` | 30 | Số ngày được đánh giá sau khi kết thúc thuê |
| `review_edit_hours` | 48 | Số giờ được sửa đánh giá một lần |
| `review_sla_hours` | 24 | Số giờ admin nên xử lý review bị ẩn hoặc có khiếu nại, quá hạn sẽ được đánh dấu |

## 4. Chất lượng AI (bộ eval 150 trường hợp, mô hình `openai/gpt-oss-20b`, prompt `review-moderation-v3`)

| Chỉ số | Precision | Recall | F1 |
|---|---|---|---|
| Spam | 91.3% | 80.8% | 85.7% |
| Độc hại | 100% | 84.0% | 91.3% |
| Đáng ngờ | 93.1% | 40.3% | 56.3% |

Độ chính xác cảm xúc 91.8%, độ trễ trung bình 747 ms. Các tín hiệu gian lận theo dữ liệu chéo giữa các đánh giá (mục 2,
REVIEW-03) được thêm sau khi chạy bộ eval này nên chưa nằm trong số liệu trên.

## 5. Giới hạn đã biết

- Nội dung vi phạm mà rule bỏ sót có thể hiện công khai trong vài giây đến vài phút cho tới khi AI kiểm tra xong.
- Rule chỉ có từ điển tiếng Việt và tiếng Anh; các ngôn ngữ khác dựa vào AI. Từ điển chỉ khớp theo từ, không có model hiểu
  ngữ cảnh, nên cách chửi chưa có trong danh sách vẫn phải dựa vào AI hoặc được admin thêm vào.
- Phản hồi của provider chứa số điện thoại sẽ bị từ chối, giống chính sách chống trao đổi ngoài nền tảng.
- Chưa có tín hiệu IP, thiết bị hoặc quan hệ bất thường giữa traveler và provider.
- Chưa có đánh giá hai chiều (provider đánh giá traveler) và phân tích theo chủ đề. SLA chỉ đánh dấu và sắp xếp, chưa gửi cảnh báo
  hay phân việc cho admin cụ thể.
