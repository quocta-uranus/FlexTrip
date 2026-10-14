# Chat giữa Provider và Traveler — Design Spec

Use cases: MSG-01..03 (branch gợi ý: `feat/in-app-chat`).

## 1. Mục tiêu

Chat 1-1 realtime giữa traveler và provider với các chức năng:

1. Nhắn tin text (realtime).
2. Sửa và xoá (thu hồi) tin nhắn của chính mình.
3. Trả lời một tin nhắn cụ thể.
4. Hiển thị overview sản phẩm (card) khi gửi link listing nội bộ.
5. Gửi ảnh và file.
6. Xem lịch sử ảnh, file, link đã gửi trong cuộc trò chuyện.
7. Gửi vị trí: ghim vị trí hiện tại hoặc chọn một điểm trên bản đồ.
8. Bắt đầu chat từ trang chi tiết listing: bấm "Liên hệ Provider" thì mở (hoặc tạo) cuộc trò chuyện với đúng provider của listing đó, kèm sẵn link listing trong ô nhập.

### Ngoài phạm vi (YAGNI)

Live location, chat nhóm, typing indicator, reaction, tìm kiếm trong chat, push notification, xoá "chỉ phía tôi", crawl preview cho link bên ngoài.

## 2. Hiện trạng

- Prisma đã có `Conversation`, `ConversationMember`, `Message` (chỉ có `content`, `isRead`).
- BE **chưa có** module `messages`. FE đã có [messages/page.tsx](../../../fe/src/app/(main)/messages/page.tsx), [useMessages.ts](../../../fe/src/hooks/useMessages.ts), `messageApi` trong [client.ts](../../../fe/src/lib/api/client.ts), gọi các route `/messages/...` và poll 5 giây.
- Upload: [upload.util.ts](../../../be/src/common/upload.util.ts) dùng Supabase Storage, chỉ hỗ trợ ảnh.
- FE đã cài `socket.io-client`, `leaflet`, `react-leaflet`. BE chưa có `@nestjs/websockets`.
- BE test: Jest (`*.spec.ts`). FE chưa có framework test.

## 3. Quyết định đã chốt

| Chủ đề | Quyết định |
|---|---|
| Realtime | Socket.IO. Gửi và ghi dữ liệu qua REST, gateway chỉ đẩy sự kiện. |
| Sửa/xoá | Chỉ người gửi, không giới hạn thời gian. Xoá là soft-delete (thu hồi với mọi người). Chỉ sửa được tin `TEXT`. |
| File | Bucket Supabase `chat` (public URL khó đoán), tối đa 10MB/file, whitelist mime. |
| Vị trí | Ghim vị trí hiện tại và chọn điểm trên bản đồ. Tin tĩnh, không live. |
| Preview | Chỉ link listing nội bộ `/listings/:id`, lấy từ DB, không crawl URL ngoài. |
| Hội thoại | 1-1, chỉ giữa traveler và provider. |
| Test | BE Jest (unit + e2e HTTP/WS), FE Vitest + Testing Library, Playwright E2E 2 người dùng. |

## 4. Dữ liệu

Một migration, tạo bằng `npx prisma migrate dev --name chat-features` và commit file migration.

```prisma
enum MessageType { TEXT IMAGE FILE LOCATION }

model Message {
  // ... các cột hiện có
  content       String    @default("") @db.Text   // rỗng với IMAGE/FILE/LOCATION không kèm chú thích
  type          MessageType @default(TEXT)
  replyToId     String?
  editedAt      DateTime?
  deletedAt     DateTime?
  latitude      Float?
  longitude     Float?
  locationLabel String?
  links         String[]                           // URL trích từ content lúc gửi

  replyTo     Message?            @relation("MessageReplies", fields: [replyToId], references: [id], onDelete: SetNull)
  replies     Message[]           @relation("MessageReplies")
  attachments MessageAttachment[]

  @@index([conversationId, createdAt])
}

model MessageAttachment {
  id        String   @id @default(cuid())
  messageId String
  url       String
  name      String
  mimeType  String
  size      Int
  message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@index([messageId])
}
```

Ràng buộc nghiệp vụ (kiểm trong service, không dùng check constraint):

- `IMAGE`/`FILE`: có 1 đến 10 attachment. `IMAGE` chỉ chứa mime ảnh. `FILE` chứa mime còn lại trong whitelist.
- `LOCATION`: bắt buộc `latitude` trong [-90, 90] và `longitude` trong [-180, 180].
- `TEXT`: `content` không rỗng sau khi trim, tối đa 4000 ký tự.

## 5. Backend: `be/src/modules/messages`

Cấu trúc: `messages.module.ts`, `messages.controller.ts`, `messages.service.ts`, `messages.gateway.ts`, `link-preview.service.ts`, `dto/`, `__tests__/`.

### 5.1 REST (tất cả `@UseGuards(JwtAuthGuard)`, DTO + class-validator)

Tiền tố `/api/v1`. Mọi route trừ `POST /messages/conversations` yêu cầu người gọi là member của conversation, nếu không trả `403 ForbiddenException`.

| Method + path | Mô tả |
|---|---|
| `GET /messages/conversations` | Danh sách conversation của user, kèm `lastMessage`, `unreadCount`. Chỉ trả conversation đã có ít nhất 1 tin, để cuộc trò chuyện vừa mở từ listing nhưng chưa gửi gì không hiện thành conversation rỗng ở phía provider. |
| `POST /messages/conversations` | `{ targetUserId }`. Tạo hoặc tái dùng conversation 1-1 (idempotent), trả `Conversation`. Không gửi tin. Từ chối (`BadRequestException`) nếu hai bên không phải một traveler và một provider, hoặc `targetUserId` là chính mình. |
| `GET /messages/conversations/:id?cursor=&limit=` | Tin nhắn mới nhất trước, cursor theo `id`, `limit` mặc định 30, tối đa 100. |
| `POST /messages/conversations/:id` | Gửi tin. Body: `{ type, content?, replyToId?, attachments?[], latitude?, longitude?, locationLabel? }`. |
| `PATCH /messages/:id` | `{ content }`. Chỉ người gửi, chỉ `TEXT`, chưa xoá. Đặt `editedAt`, tính lại `links`. |
| `DELETE /messages/:id` | Chỉ người gửi. Đặt `deletedAt`. Idempotent. |
| `POST /messages/conversations/:id/attachments` | `multipart/form-data`, field `files` (tối đa 10). Trả `[{ url, name, mimeType, size }]`. Client truyền kết quả vào body gửi tin. |
| `POST /messages/conversations/:id/read` | Đánh dấu đã đọc các tin của đối phương. |
| `GET /messages/conversations/:id/shared?kind=media\|files\|links&cursor=&limit=` | Lịch sử chia sẻ, mới nhất trước, phân trang cursor. |

Dạng trả về của một tin (`MessageDto`):

- `id, type, senderId, conversationId, createdAt, editedAt, deletedAt, isRead`.
- `content` và `attachments` là `null` và `[]` khi `deletedAt` khác null (server che dữ liệu, không dựa vào FE).
- `latitude, longitude, locationLabel` (null khi đã xoá).
- `replyTo`: `{ id, senderId, type, content (cắt 120 ký tự), deleted }` hoặc `null`. Khi tin gốc đã xoá thì `content=null`, `deleted=true`.
- `listingPreviews`: `[{ id, title, imageUrl, price, currency, location }]` cho các link `/listings/:id` trong `links`, chỉ listing `ACTIVE`, tối đa 3 preview mỗi tin.

### 5.2 Quy tắc

- Reply: `replyToId` phải thuộc cùng conversation, nếu không `BadRequestException`. Được phép reply tin đã xoá hay tin của chính mình.
- Sửa tin: `ForbiddenException` nếu không phải người gửi. `BadRequestException` nếu tin không phải `TEXT` hoặc đã xoá.
- Tin không tồn tại: `NotFoundException`.
- Xoá tin media: chỉ đặt `deletedAt`. File trong Storage được giữ lại (xem mục 9, rủi ro).
- `links`: trích bằng regex `https?://` từ content, tối đa 10 URL mỗi tin, bỏ trùng. Link listing nội bộ là link có origin thuộc `FRONTEND_URL` và path khớp `^/listings/([\w-]+)$`.
- `shared`:
  - `media` = tin `IMAGE`, trả attachment phẳng kèm `messageId`, `createdAt`.
  - `files` = tin `FILE`, tương tự.
  - `links` = tin có `links` không rỗng, trả `{ messageId, url, createdAt, listingPreview? }`.
  - Luôn loại các tin đã xoá.
- Mọi thao tác ghi cập nhật `Conversation.updatedAt`.

### 5.3 Upload

- Dùng `FilesInterceptor` (multer, memory storage) với `limits.fileSize = 10MB`, tối đa 10 file.
- Whitelist mime: `image/jpeg, image/png, image/webp, image/gif, application/pdf, application/msword, ...docx, application/vnd.ms-excel, ...xlsx, text/plain, application/zip`.
- Xác minh bằng magic bytes: `file-type` không phải dependency trực tiếp của BE nên không thêm package, tự kiểm tra bảng signature nhỏ (JPEG, PNG, GIF, WEBP, PDF, ZIP/OOXML, OLE2 cho doc/xls). `text/plain` chỉ kiểm tra không chứa byte NUL. Mime không khớp thì `BadRequestException`.
- Tên lưu trong Storage được sinh bởi server (timestamp + hash). Tên gốc chỉ lưu trong `MessageAttachment.name`, sau khi loại ký tự điều khiển và path separator.
- Mở rộng `uploadImage` để nhận `contentType` rõ ràng thay vì suy ra từ extension (hiện mặc định `image/jpeg`).

### 5.4 Gateway Socket.IO

- Namespace mặc định, CORS dùng cùng whitelist origin như `main.ts`.
- `handleConnection`: lấy access token từ `handshake.auth.token`, verify JWT, join room `user:{userId}`. Token sai thì `disconnect`.
- Sau khi service ghi thành công, gửi tới room `user:{id}` của các member:
  - `message:new` (`MessageDto`), `message:updated` (`MessageDto`), `message:deleted` (`{ id, conversationId }`), `message:read` (`{ conversationId, readerId }`).
- Client không phát sự kiện ghi nào. Mọi thay đổi đi qua REST, nên chỉ có một đường ghi để test.

## 6. Frontend

### 6.1 Thành phần

Tách [messages/page.tsx](../../../fe/src/app/(main)/messages/page.tsx) (đang dùng inline style, trái quy tắc dự án) thành component Tailwind + shadcn trong `fe/src/components/chat/`:

- `conversation-list.tsx`, `message-list.tsx` (cuộn vô hạn lên trên, cuộn tới tin đích).
- `message-bubble.tsx`: các trạng thái thường, đã sửa ("đã chỉnh sửa"), đã thu hồi, có reply, kèm menu (sửa, xoá, trả lời) cho tin của mình, chỉ "trả lời" cho tin của đối phương.
- `message-composer.tsx`: ô nhập, thanh reply, nút đính kèm (chọn file, preview và gỡ trước khi gửi), nút vị trí.
- `listing-preview-card.tsx`, `location-card.tsx` (bản đồ nhỏ react-leaflet + link mở Google Maps), `location-picker.tsx` (dialog: nút "vị trí hiện tại" dùng `navigator.geolocation` và bản đồ để kéo ghim).
- `shared-media-panel.tsx`: 3 tab Ảnh (lưới, bấm để xem lớn), File (tên, dung lượng, tải về), Link (kèm card nếu là listing). Bấm một mục cuộn tới tin gốc.

### 6.2 Dữ liệu và realtime

- `fe/src/lib/api/client.ts`: mở rộng `messageApi` (không gọi `fetch` ở nơi khác).
- `fe/src/hooks/useMessages.ts`: thêm `useEditMessage`, `useDeleteMessage`, `useUploadAttachments`, `useSharedItems(kind)`. Phân trang bằng `useInfiniteQuery`.
- `fe/src/lib/socket.ts` + provider: một kết nối `socket.io-client` dùng access token hiện tại, kết nối lại khi token refresh. Khi nhận sự kiện thì cập nhật cache (`setQueryData` / `invalidateQueries`). Khi socket mất kết nối thì bật `refetchInterval` 10 giây làm fallback, tắt lại khi kết nối lại.
- Zod schema cho form gửi tin trong `fe/src/lib/validators/message.ts` (giới hạn độ dài, vị trí hợp lệ, danh sách file).
- Kiểu dùng chung trong `fe/src/types/message.ts`, thay `Message` theo `MessageDto` mới.

### 6.3 Vào chat từ listing

Luồng: trang chi tiết listing, bấm "Liên hệ Provider", mở đúng cuộc trò chuyện với `listing.provider.id`.

1. Nút ở [listings/[id]/page.tsx](../../../fe/src/app/(main)/listings/[id]/page.tsx) (hiện là link `/messages?to=...`, không có tác dụng vì trang messages không đọc `to`) đổi thành nút gọi `useStartConversation` với `targetUserId = listing.provider.id`, rồi `router.push('/messages?c=<conversationId>&listing=<listingId>')`.
2. Chưa đăng nhập: chuyển tới `/login` kèm redirect quay lại trang listing. Không phải traveler (provider hoặc admin), hoặc listing là của chính user: ẩn nút.
3. Trang messages đọc `c` để chọn conversation đang mở (thay cho việc luôn chọn conversation đầu tiên), và đọc `listing` để điền sẵn link `{origin}/listings/{id}` vào composer nếu composer đang trống. Người dùng có thể sửa hoặc xoá trước khi gửi; khi gửi, link được xử lý như mọi link listing (hiện card ở 5.1). Không tự động gửi tin.
4. Nếu đã có conversation giữa hai người thì dùng lại, không tạo mới. Một cặp (traveler, provider) chỉ có một conversation cho mọi listing.
5. Sau khi điền sẵn, xoá `listing` khỏi URL (`router.replace`) để refresh không điền lại.

### 6.4 Xử lý lỗi UI

- Gửi thất bại: bubble hiện trạng thái lỗi và nút gửi lại. Upload quá 10MB hoặc sai định dạng: báo lỗi ngay phía client, và hiển thị lỗi server nếu client lọt.
- Không có quyền vị trí: hiển thị thông báo, người dùng vẫn chọn được điểm trên bản đồ.

## 7. Bảo mật

- Mọi endpoint kiểm tra membership. Gateway chỉ gửi vào room của chính các member.
- Che dữ liệu tin đã xoá ở server.
- Nội dung chỉ render dạng text (React tự escape), link chỉ cho phép `http/https`.
- `url` của attachment phải thuộc bucket `chat` của project, tránh client gửi URL tuỳ ý rồi hiển thị như file của hệ thống.
- Rate limit gửi tin và upload: ngoài phạm vi. Guard hiện có (`auth/guards/rate-limit.guard.ts`) là in-memory theo IP và dành riêng cho auth, không tái dùng được.

## 8. Testing

### BE (Jest, `be/src/modules/messages/__tests__/`)

- **Unit (service):**
  - Membership (member và không phải member).
  - Chỉ traveler↔provider được bắt đầu chat, không chat với chính mình.
  - `POST /messages/conversations` idempotent (gọi hai lần cho cùng cặp, từ hai phía, ra cùng một conversation).
  - Conversation chưa có tin không xuất hiện trong danh sách của cả hai bên.
  - Reply sang tin của conversation khác bị từ chối.
  - Sửa: người lạ, tin không phải TEXT, tin đã xoá.
  - Soft-delete che `content` và `attachments`, idempotent.
  - Trích link: nhiều link, bỏ trùng, tối đa 10.
  - `listingPreviews` chỉ lấy `ACTIVE`, bỏ listing không tồn tại.
  - Validate vị trí ngoài khoảng.
  - `shared` từng `kind`, loại tin đã xoá, phân trang cursor.
  - Whitelist upload: sai mime, magic bytes không khớp, quá 10MB.
- **e2e (supertest + `socket.io-client`, DB test):**
  - Hai user kết nối, A gửi B nhận `message:new`. Sửa và xoá phát `message:updated` / `message:deleted`.
  - User ngoài cuộc không nhận sự kiện và nhận 403 khi gọi REST.
  - Socket với token sai bị ngắt.
  - Luồng upload rồi gửi tin ảnh rồi xuất hiện trong `shared?kind=media`.
  - Storage được mock.

### FE (Vitest + Testing Library)

- `message-bubble`: các trạng thái đã sửa, đã thu hồi, có reply, có preview, quyền hiển thị menu.
- `message-composer`: reply bar, chọn và gỡ file, chặn file quá lớn, gửi.
- `listing-preview-card`, `location-card`, `shared-media-panel` (3 tab, rỗng, cuộn tới tin).
- Nút liên hệ trên trang listing: hiện hoặc ẩn đúng theo vai trò, chưa đăng nhập thì chuyển sang login, gọi đúng `targetUserId` và điều hướng tới `?c=...&listing=...`. Trang messages chọn đúng conversation theo `c` và điền sẵn link listing chỉ khi composer trống.
- Hàm trích link, schema Zod, logic cập nhật cache từ sự kiện socket.

### Playwright E2E (`fe/e2e/chat.spec.ts`)

Hai browser context (traveler và provider) với dữ liệu seed:

1. Gửi, nhận realtime, trả lời, sửa, thu hồi (cả hai phía thấy).
2. Gửi link listing và thấy card.
3. Gửi ảnh và file, mở panel, thấy đủ ở các tab.
4. Gửi vị trí bằng picker (mock geolocation).
5. Traveler mở listing, bấm "Liên hệ Provider", vào đúng chat với provider của listing đó, thấy link listing điền sẵn, gửi, provider nhận tin kèm card sản phẩm. Bấm lại từ một listing khác của cùng provider thì vào lại đúng conversation cũ.

### Phụ thuộc test mới ở FE

`vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `@playwright/test`. Cài sau khi kiểm tra chưa có sẵn trong dự án (đã kiểm tra: chưa có).

## 9. Rủi ro và việc để sau

- File của tin đã xoá vẫn còn trong Storage. Dọn bằng job BullMQ là việc làm sau, nếu có yêu cầu pháp lý hoặc dung lượng.
- Bucket `chat` public: ai có URL đều xem được. Đã chấp nhận ở thiết kế. Nếu sau này cần riêng tư hơn, chuyển sang signed URL.
- Socket.IO nhiều instance cần Redis adapter. Hiện chạy một instance nên chưa làm.
- Quy ước vị trí: toạ độ gửi theo WGS84, tin tĩnh, người nhận xem thấy đúng toạ độ lúc gửi.
