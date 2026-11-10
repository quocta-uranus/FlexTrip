# Review AI Evaluation

Bộ evaluation này đo chất lượng thực tế của Groq Review Moderation bằng dataset đã gắn nhãn trước. Đây không phải unit test và mỗi case hợp lệ sẽ gọi Groq API thật.

## Chuẩn bị

Đặt các biến sau trong `be/.env`:

```env
GROQ_API_KEY=<your-key>
GROQ_MODEL=openai/gpt-oss-20b
GROQ_REVIEW_MAX_COMPLETION_TOKENS=400
```

Không đưa API key vào dataset, report hoặc Git. Dataset tại `dataset/review-eval-dataset.json` chỉ chứa dữ liệu kiểm thử tổng hợp và không chứa PII.

Dataset thật là file local và bị Git bỏ qua. Khi thiết lập trên máy mới, tạo file từ mẫu:

```powershell
Copy-Item .\evals\reviews\dataset\review-eval-dataset.example.json `
  .\evals\reviews\dataset\review-eval-dataset.json
```

Sau đó thay các case mẫu bằng bộ dữ liệu đã được nhóm gắn nhãn. Runner yêu cầu đúng 10 case có mode `smoke`, 30 case có mode `quick` và 150 case có mode `full`.

Không nên hạ `GROQ_REVIEW_MAX_COMPLETION_TOKENS` dưới 400 với model hiện tại. Smoke test cho thấy mức 150 thất bại thường xuyên và mức 300 vẫn có thể thất bại với prompt-injection case vì Groq không hoàn thành được JSON hợp lệ. Đây là mức trần; token thực tế vẫn được ghi trong report.

## Chế độ chạy

```bash
npm run eval:reviews -- --mode=smoke
npm run eval:reviews -- --mode=quick
npm run eval:reviews -- --mode=full
```

- `smoke`: 10 case cố định để kiểm tra kết nối và các nhóm nhãn chính.
- `quick`: 30 case cố định để đánh giá nhanh.
- `full`: toàn bộ 150 case, dùng khi tạo baseline hoặc báo cáo chính thức.
- Nếu không truyền mode, runner dùng `smoke` để bảo vệ quota.

Thêm `--cascade` để đo luôn cách hoạt động của bước phân loại cục bộ (PhoBERT trước, AI chỉ cho ca khó): runner gọi service ở
`REVIEW_CLASSIFIER_URL` (mặc định `http://127.0.0.1:8001`, xem `ml/review-classifier/README.md`), mô phỏng quyết định của `routeReview`
bằng kết quả AI thật của lần chạy này và ghi thêm mục "Cascade" vào report: tỷ lệ gọi AI tiết kiệm được, F1 của quyết định ẩn review và độ chính xác
cảm xúc. Có thể chạy lại phần này không tốn Groq bằng `--mode=full --resume --cascade` khi checkpoint đã đủ 150 ca. Report cũng luôn có mục
"Hide decision" so sánh chỉ rule, chỉ AI và rule + AI.

Runner mặc định chờ 1 giây giữa các request. Có thể tăng khoảng nghỉ mà không sửa code:

```powershell
$env:REVIEW_EVAL_DELAY_MS=3000
npm run eval:reviews -- --mode=full
```

## Checkpoint và resume

Checkpoint được lưu sau mỗi case. Nếu quá trình bị dừng, tiếp tục bằng đúng mode:

```bash
npm run eval:reviews -- --mode=full --resume
```

Resume chỉ bỏ qua case đã có prediction hợp lệ. Case lỗi được thử lại. Runner từ chối checkpoint nếu `model`, `promptVersion` hoặc `datasetVersion` không trùng với lần chạy hiện tại.

Không dùng `--resume` nếu muốn bắt đầu một lần chạy mới; runner sẽ tạo lại checkpoint của mode đó.

## Kết quả

Các file sinh ra nằm trong `evals/reviews/results/` và không được commit:

```text
review-eval-results.json
review-eval-failed-cases.json
review-eval-report.md
checkpoint-smoke.json | checkpoint-quick.json | checkpoint-full.json
```

Report có trạng thái:

- `COMPLETE`: tất cả case trong mode đã được xử lý, kể cả case API/schema thất bại sau retry.
- `INCOMPLETE`: quá trình bị dừng hoặc rate limit/quota vẫn còn sau retry.

Không dùng report `INCOMPLETE` như kết quả full chính thức. `coverage` là tỷ lệ prediction thành công và hợp lệ trên toàn bộ dataset đã chọn.

## Cách đọc metric

- **Accuracy**: tỷ lệ sentiment dự đoán đúng.
- **Precision**: trong các case AI gắn cờ, tỷ lệ thật sự vi phạm.
- **Recall**: trong các case thật sự vi phạm, tỷ lệ AI phát hiện được.
- **F1**: trung bình điều hòa giữa precision và recall.
- **False positive**: review an toàn bị gắn cờ nhầm.
- **False negative**: review vi phạm bị bỏ lọt.
- **Quality metrics** chỉ tính prediction thành công và hợp lệ.
- **Reliability metrics** tính trên toàn bộ tập case đã chọn.

Threshold analysis dùng lại score của cùng một lần gọi Groq tại các ngưỡng 50, 60, 70, 80 và 90. Nó không gọi API thêm. Threshold được đề xuất riêng cho spam, toxicity và suspicious theo F1 cao nhất, sau đó ưu tiên false-positive rate thấp hơn.

## Baseline

Chỉ sau khi nhóm kiểm tra report `COMPLETE`, copy report được chọn vào `evals/reviews/baseline/`. Khi đổi prompt, model hoặc dataset, chạy lại mode `full` và so sánh với baseline trước đó. Không sửa ground truth chỉ để tăng điểm; nếu sửa nhãn sai phải tăng `datasetVersion` và ghi nhận thay đổi.

## Bộ kiểm tra độc lập (holdout)

`dataset/review-eval-holdout.json` gồm 88 review viết riêng, gán nhãn một lần trước khi chạy và **không được dùng để chỉnh prompt,
từ điển hay dấu hiệu chuyển ca khó**. Bộ 150 ca chính đã được chỉnh theo trong quá trình làm, nên số liệu của nó lạc quan; bộ này mới cho
con số gần với review thật hơn. Nội dung gồm: review bình thường (khen, chê lịch sự, 3 sao, không dấu, viết tắt, emoji, tiếng Anh), 12
câu "trông giống vi phạm nhưng không phải" (con chó, đồ ngủ, thằng bé, mày mò, giết thời gian, giá tiền...), xúc phạm, đe dọa, spam,
và các review đáng ngờ (lạc đề, chưa thuê, đổi sao lấy voucher, chèn chỉ dẫn, sao mâu thuẫn). 28 ca cần bị ẩn, 26 ca đáng ngờ.

```bash
npm run eval:reviews -- --set=holdout --cascade      # đầy đủ, gọi Groq
npm run eval:reviews:local -- --set=holdout          # không gọi Groq: rule, PhoBERT và quyết định chuyển ca khó
```

- Kết quả của `--set=holdout` nằm ở `results/holdout/`, không ghi đè kết quả bộ chính. Mặc định chạy toàn bộ (mode `full`).
- Một lần chạy đầy đủ tốn khoảng 100 nghìn token Groq. Tài khoản miễn phí giới hạn 200 nghìn token mỗi ngày cho model này và quota dùng
  chung với chatbot và kiểm duyệt trong ứng dụng, nên đừng chạy nhiều lần liên tiếp. Gặp lỗi giới hạn thì chờ rồi chạy tiếp bằng
  `--resume` (đặt `REVIEW_EVAL_DELAY_MS=6000` để không vượt giới hạn mỗi phút).
- `eval:reviews:local` chấm đầy đủ những review mà cascade tự xử lý cục bộ (đúng hay sai), còn những review chuyển cho AI thì chỉ đếm.
  Nếu sau này chỉnh luật theo kết quả bộ này thì bộ này không còn độc lập; hãy viết một bộ mới.
