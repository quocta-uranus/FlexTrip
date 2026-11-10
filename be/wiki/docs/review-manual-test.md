# Báo cáo test thủ công: đánh giá và kiểm duyệt

Môi trường: BE 3001, FE 3000, service PhoBERT 8001, dữ liệu demo `seed:review-demo`.
Tài khoản: `demo-traveler@flextrip.dev`, `demo-provider@flextrip.dev`, `admin@flextrip.dev`.
Dọn dữ liệu demo: `cd be && npm run cleanup:review-demo`.

Lưu ý trung thực:
- Ảnh chụp lấy trong Browser pane và **không được lưu thành tệp**, nên báo cáo không đính kèm ảnh. Muốn có ảnh, tự lặp lại ca theo cột "Thao tác" và chụp màn hình.
- Cột "Kết quả thật" của nhóm A lấy từ DB sau khi chạy (`report_state.js`). Nhóm B-D ghi theo kết quả lúc test; chỉ có hai ca lệch (10 và 17c).
- Quota Groq trong ngày gần cạn; ca nào cần Groq mà gặp 429 thì ghi rõ, không đổi code.

## A. Traveler gửi review

| # | Thao tác | Mong đợi | Kết quả thật |
|---|---|---|---|
| 1 | Tab "Chờ đánh giá"; booking quá 40 ngày; gọi API trực tiếp | Hiện hạn còn lại; booking quá hạn không có nút; API trả 409 `REVIEW_WINDOW_EXPIRED` | Đạt |
| 2 | 5 sao, nội dung sạch | Công khai ngay, PhoBERT duyệt, không thông báo | Đạt: PUBLISHED, "[ML] PhoBERT: bình thường (100%)" |
| 3 | Câu xúc phạm không có trong từ điển | Công khai tạm, PhoBERT ẩn, có chuông "đã bị ẩn" | Đạt: FLAGGED, toxicity 100 |
| 4 | `d1t m3` (chữ lách) | Rule giữ ngay | Đạt: FLAGGED, "[RULE] từ ngữ tục tĩu" |
| 5 | Cụm trong từ điển | Rule giữ ngay | Đạt: sau đó admin từ chối (REJECTED) |
| 6 | Có số điện thoại / `zalo.me` | Rule coi là spam, giữ | Đạt: FLAGGED, spam 90 |
| 7 | "Tốt tốt tốt…" lặp | Rule giữ | Đạt: FLAGGED, "nội dung bị lặp lại" |
| 8 | Trùng nội dung review khác | Công khai rồi bị ẩn | Đạt: FLAGGED, "trùng với một đánh giá khác" |
| 9 | Gửi dồn nhiều review/24h | Vẫn công khai hoặc vào "cần xem lại" | Đạt (gắn cờ "quá nhiều đánh giá trong 24 giờ") |
| 10 | Câu giống vi phạm nhưng sạch ("con chó nhà mình", "đồ ngủ"…) | Công khai, không bị giữ | **Lệch**: bị giữ (spam 80); lý do hiển thị cho admin gây hiểu lầm. Admin phải duyệt lại thủ công |
| 11 | Quảng cáo, sao mâu thuẫn, đe dọa, 3 sao | Cascade chuyển AI | Đạt: 5 sao nội dung tiêu cực được AI nhận ra, admin từ chối |
| 12 | Tắt classifier | Mọi review qua AI | Đạt: nguồn "AI", log `CLASSIFIER_UNAVAILABLE` |

Nguyên nhân ca 10: `NEGATED_SPAM` trong `review-analysis-reconcile.ts` chỉ nhận phủ định hẹp, trong khi `NEGATED_TOXICITY` nhận rộng ("không/chẳng/chưa/no/not/without"). Câu "Không có nội dung xúc phạm, spam…" không được coi là phủ định nên điểm spam 80 vẫn dùng. Ngoài ra `review-moderation-display.ts` dịch lý do chứa "xúc phạm" thành lời buộc tội dù đã bị phủ định. Đã sửa: `NEGATED_SPAM` nhận phủ định rộng như `NEGATED_TOXICITY`, và trang admin ẩn các lý do chỉ để phủ nhận vi phạm. Có test mới.

## B. Sau khi gửi

| # | Nội dung | Kết quả |
|---|---|---|
| 13 | Sửa review một lần, hết nút; sửa thành nội dung vi phạm bị giữ; quá 48h mất nút | Đạt |
| 14 | Khiếu nại (tối thiểu 10 ký tự), không khiếu nại lần hai | Đạt (có thông báo "Đã ghi nhận khiếu nại") |
| 15 | Huy hiệu trạng thái, chuông, điều hướng | Đạt |
| 16 | Nhắc đánh giá đúng một lần | Đạt ("Hãy đánh giá chuyến thuê của bạn") |

## C. Provider

| # | Nội dung | Kết quả |
|---|---|---|
| 17a | Phản hồi hợp lệ | Đạt |
| 17b | Phản hồi có từ xúc phạm / số điện thoại | Đạt, bị từ chối kèm thông báo |
| 17c | Phản hồi có lời đe dọa ("tìm đến tận nhà") | **Lệch**: bị chấp nhận. Cascade/rule chưa bắt cụm đe dọa này trong phản hồi. Đã sửa: thêm cụm đe dọa vào từ điển, và phản hồi có dấu hiệu đe dọa bị từ chối khi AI không trả lời được. Có test mới |
| 18 | Sửa phản hồi, hết 2 lượt mất nút | Đạt |
| 19 | Báo cáo review, "Lý do khác" cần chi tiết, không báo cáo hai lần | Đạt |

## D. Admin

| # | Nội dung | Kết quả |
|---|---|---|
| 20 | `/admin/reviews`: chip đếm, "Quá hạn xử lý", sắp xếp, tìm kiếm, lọc | Đạt |
| 21 | Duyệt / Từ chối (bắt buộc lý do) / Giữ nguyên / AI phân tích lại | Đạt |
| 22 | Bỏ qua / chấp nhận báo cáo của provider | Đạt |
| 23 | Duyệt/từ chối hàng loạt | Đạt |
| 24 | `/admin/reviews/terms`: thêm, trùng, quá ngắn, "túi ngủ" bị chặn, tắt/bật, thử câu, xóa | Đạt |
| 25 | `/admin/08-ai-config`: ngưỡng và `review_sla_hours`, đặt lại mặc định | Đạt |
| 26 | Nhật ký audit | Đạt |
| 27 | Traveler mở `/admin/reviews` | Đạt, bị chặn |

## Kiểm tra sau cùng
Sau khi test, các test của `reviews`, `admin`, `system-config` đạt 333/333. Có một lỗi cách ly test: `REVIEW_CLASSIFIER_URL` trong `be/.env` làm 8 test dùng nhầm service thật. Đã sửa bằng một dòng trong `auth-harness.ts` (chưa commit).
