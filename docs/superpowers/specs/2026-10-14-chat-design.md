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
| Test | BE Jest (unit + e2e HTTP/WS), FE Vitest + Testing Library, Playwright E2E 2 người dùng (test upload bật bằng `E2E_UPLOADS=1`). |

## 4. Dữ liệu

Một migration (`chat_features`), tạo bằng `npx prisma migrate dev` và commit file migration.

`Conversation` có thêm `pairKey String? @unique` (hai user id sắp xếp, nối bằng `:`), để "bắt đầu chat" idempotent kể cả khi hai bên gọi đồng thời.

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
- `LOCATION`: bắt buộc `latitude` và `longitude` là số (0 hợp lệ), `latitude` trong [-90, 90], `longitude` trong [-180, 180].
- `TEXT`: `content` không rỗng sau khi trim, tối đa 4000 ký tự.

## 5. Backend: `be/src/modules/messages`

Cấu trúc: `messages.module.ts`, `messages.controller.ts`, `messages.service.ts`, `messages.gateway.ts`, `link-preview.service.ts`, `dto/`, `__tests__/`.

### 5.1 REST (tất cả `@UseGuards(AccessTokenGuard)`, DTO + class-validator)

`AccessTokenGuard` là guard JWT thực tế của repo (CLAUDE.md gọi là `JwtAuthGuard`).

Tiền tố `/api/v1`. Mọi route trừ `POST /messages/conversations` yêu cầu người gọi là member của conversation, nếu không trả `403 ForbiddenException`.

| Method + path | Mô tả |
|---|---|
| `GET /messages/conversations` | Danh sách conversation của user, kèm `lastMessage`, `unreadCount`. Chỉ trả conversation đã có ít nhất 1 tin, để cuộc trò chuyện vừa mở từ listing nhưng chưa gửi gì không hiện thành conversation rỗng ở phía provider. |
| `GET /messages/conversations/:id/info` | Trả `Conversation` (kèm đối phương) dù chưa có tin nào, để header chat hiển thị được cho cuộc trò chuyện vừa mở mà còn ẩn khỏi danh sách. |
| `POST /messages/conversations` | `{ targetUserId }`. Tạo hoặc tái dùng conversation 1-1 (idempotent), trả `Conversation`. Không gửi tin. Từ chối (`BadRequestException`) nếu hai bên không phải một traveler và một provider, hoặc `targetUserId` là chính mình. |
| `GET /messages/conversations/:id?cursor=&limit=` | Tin nhắn mới nhất trước, cursor theo `id`, `limit` mặc định 30, tối đa 100. |
| `POST /messages/conversations/:id` | Gửi tin. Body: `{ type, content?, replyToId?, attachments?[], latitude?, longitude?, locationLabel? }`. |
| `PATCH /messages/:id` | `{ content }`. Chỉ người gửi, chỉ `TEXT`, chưa xoá. Đặt `editedAt`, tính lại `links`. Ghi bằng `updateMany` có điều kiện `deletedAt: null`, nên sửa đua với thu hồi trả `BadRequestException`. |
| `DELETE /messages/:id` | Chỉ người gửi. Đặt `deletedAt`. Idempotent. Cũng dùng `updateMany` có điều kiện `deletedAt: null`, nên `message:deleted` chỉ phát một lần dù bị gọi đồng thời. |
| `POST /messages/conversations/:id/attachments` | `multipart/form-data`, field `files` (tối đa 10). Trả `[{ url, name, mimeType, size }]`. Client truyền kết quả vào body gửi tin. Route có guard kiểm tra membership chạy trước multer, nên người ngoài bị `403` trước khi body bị buffer. |
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
- Ghi vào Storage qua `chat-storage.service.ts` (bọc Supabase, mock được trong test). Mở rộng `uploadImage` để nhận `contentType` rõ ràng thay vì suy ra từ extension (hiện mặc định `image/jpeg`).

### 5.4 Gateway Socket.IO

- Namespace mặc định, CORS dùng cùng whitelist origin như `main.ts`.
- `handleConnection`: lấy access token từ `handshake.auth.token`, verify JWT, join room `user:{userId}`, rồi phát `ready` tới chính socket đó (FE coi `ready` là "đã kết nối"). Token sai thì `disconnect`.
- Sau khi service ghi thành công, gửi tới room `user:{id}` của các member:
  - `message:new` (`MessageDto`), `message:updated` (`MessageDto`), `message:deleted` (`{ id, conversationId, deletedAt }`), `message:read` (`{ conversationId, readerId }`).
- `emitToUsers` không bao giờ broadcast khi danh sách người nhận rỗng.
- Client không phát sự kiện ghi nào. Mọi thay đổi đi qua REST, nên chỉ có một đường ghi để test.

## 6. Frontend

### 6.1 Thành phần

Tách [messages/page.tsx](../../../fe/src/app/(main)/messages/page.tsx) (đang dùng inline style, trái quy tắc dự án) thành component Tailwind + shadcn trong `fe/src/components/chat/`:

- `conversation-list.tsx`, `message-list.tsx` (cuộn vô hạn lên trên, cuộn tới tin đích).
- `message-bubble.tsx`: các trạng thái thường, đã sửa ("đã chỉnh sửa"), đã thu hồi, có reply, kèm menu (sửa, xoá, trả lời) cho tin của mình, chỉ "trả lời" cho tin của đối phương.
- `message-composer.tsx`: ô nhập, thanh reply, nút đính kèm (chọn file, preview và gỡ trước khi gửi), nút vị trí. Ảnh và file khác được gửi thành các tin riêng (caption và reply gắn vào tin đầu tiên). Enter an toàn với IME (bỏ qua Enter xác nhận gợi ý, kể cả `keyCode` 229 của Safari). Wrapper chừa chỗ bên phải cho nút nổi của AI chatbot để không che nút Gửi.
- `chat-window.tsx`: ghép danh sách tin, composer và panel lịch sử cho một conversation.
- `listing-preview-card.tsx`, `location-card.tsx` (bản đồ nhỏ react-leaflet + link mở Google Maps), `location-picker.tsx` (dialog: nút "Dùng vị trí hiện tại" dùng `navigator.geolocation`, hoặc bấm lên bản đồ để đặt ghim; `location-picker-map.tsx` là phần bản đồ).
- `shared-media-panel.tsx`: 3 tab Ảnh (lưới, bấm để xem lớn), File (tên, dung lượng, tải về), Link (kèm card nếu là listing). Bấm một mục cuộn tới tin gốc.

### 6.2 Dữ liệu và realtime

- `fe/src/lib/api/client.ts`: mở rộng `messageApi` (không gọi `fetch` ở nơi khác).
- `fe/src/hooks/useMessages.ts`: thêm `useEditMessage`, `useDeleteMessage`, `useUploadAttachments`, `useSharedItems(kind)`. Phân trang bằng `useInfiniteQuery`.
- `fe/src/lib/socket.ts` + hook `useChatSocket()` (`fe/src/hooks/use-chat-socket.ts`) do trang messages mount, không có provider toàn app: một kết nối `socket.io-client` dùng access token hiện tại, kết nối lại khi token refresh. Khi nhận sự kiện thì cập nhật cache (`setQueryData` / `invalidateQueries`). Khi socket mất kết nối thì bật `refetchInterval` 10 giây làm fallback, tắt lại khi kết nối lại.
- Zod schema cho form gửi tin trong `fe/src/lib/validators/message.ts` (giới hạn độ dài, vị trí hợp lệ, danh sách file).
- Kiểu dùng chung trong `fe/src/types/message.ts`, thay `Message` theo `MessageDto` mới.

### 6.3 Vào chat từ listing

Luồng: trang chi tiết listing, bấm "Liên hệ Provider", mở đúng cuộc trò chuyện với `listing.provider.id`.

1. Nút ở [listings/[id]/page.tsx](../../../fe/src/app/(main)/listings/[id]/page.tsx) (hiện là link `/messages?to=...`, không có tác dụng vì trang messages không đọc `to`) đổi thành nút gọi `useStartConversation` với `targetUserId = listing.provider.id`, rồi `router.push('/messages?c=<conversationId>&listing=<listingId>')`.
2. Chưa đăng nhập: chuyển tới `/login?redirect=<path>` (xem mục 9: luồng login hiện chưa dùng `redirect`). Không phải traveler (provider hoặc admin), hoặc listing là của chính user: ẩn nút. Khi đang khôi phục phiên (có refresh token nhưng chưa có user) nút cũng ẩn.
3. Trang messages coi `?c=` trên URL là nguồn sự thật: đọc `c` để chọn conversation đang mở (thay cho việc luôn chọn conversation đầu tiên), và đọc `listing` để điền sẵn link `{origin}/listings/{id}` vào composer nếu composer đang trống. Người dùng có thể sửa hoặc xoá trước khi gửi; khi gửi, link được xử lý như mọi link listing (hiện card ở 5.1). Không tự động gửi tin.
4. Nếu đã có conversation giữa hai người thì dùng lại, không tạo mới. Một cặp (traveler, provider) chỉ có một conversation cho mọi listing.
5. Sau khi điền sẵn, xoá `listing` khỏi URL (`router.replace`) để refresh không điền lại.

### 6.4 Xử lý lỗi UI

- Gửi thất bại: bubble hiện trạng thái lỗi và nút gửi lại. Upload quá 10MB hoặc sai định dạng: báo lỗi ngay phía client, và hiển thị lỗi server nếu client lọt.
- Không có quyền vị trí: hiển thị thông báo, người dùng vẫn chọn được điểm trên bản đồ.

## 7. Bảo mật

- Mọi endpoint kiểm tra membership. Gateway chỉ gửi vào room của chính các member.
- Che dữ liệu tin đã xoá ở server.
- Nội dung chỉ render dạng text (React tự escape), link chỉ cho phép `http/https`.
- `url` của attachment phải thuộc bucket `chat` của project, tránh client gửi URL tuỳ ý rồi hiển thị như file của hệ thống. Kiểm tra bằng cách parse URL: cùng origin, path bắt đầu bằng `/storage/v1/object/public/chat/`, không có query hay fragment, không có segment `.`/`..` (kể cả dạng encode) hay dấu ``.
- Rate limit gửi tin và upload: ngoài phạm vi. Guard hiện có (`auth/guards/rate-limit.guard.ts`) là in-memory theo IP và dành riêng cho auth, không tái dùng được.

## 8. Testing

Kết quả lần chạy cuối: BE 76 test (10 suite messages + common), BE auth/KYC hồi quy 76 test (8 suite), FE 91 test (16 file), Playwright 3 chạy + 1 skip.

### BE (Jest, `be/src/modules/messages/__tests__/` và `be/src/common/__tests__/cors.util.spec.ts`)

Các spec e2e dùng chung một DB test (`TEST_DATABASE_URL`), nên phải chạy `--runInBand`. Storage được mock.

| File | Số test | Nội dung |
|---|---|---|
| `messages.spec.ts` | 16 | Conversation (idempotent hai phía, chỉ traveler↔provider, không tự chat, ẩn conversation rỗng nhưng `/info` cho member, `lastMessage`/`unreadCount`), gửi text, phân trang cursor, reply (khác conversation bị từ chối), preview chỉ cho listing `ACTIVE`, validate vị trí (ngoài khoảng, null, 0 hợp lệ), đánh dấu đã đọc, membership/401 |
| `messages.edit-delete.spec.ts` | 6 | Sửa (người lạ, không phải TEXT, đã xoá, rỗng, tính lại link), soft-delete che dữ liệu và idempotent, reply tới tin đã xoá |
| `messages.realtime.spec.ts` | 1 | HTTP + `socket.io-client`: `message:new/updated/deleted/read` tới cả hai member, outsider không nhận gì |
| `messages.gateway.spec.ts` | 3 | Token sai bị ngắt, `emitToUsers` chỉ tới đúng user, không broadcast khi rỗng người nhận |
| `messages.attachments.spec.ts` | 9 | Upload rồi gửi tin ảnh rồi thấy trong `shared`, whitelist mime, magic bytes, quá 10MB, quá 10 file, người ngoài bị 403, URL ngoài bucket bị từ chối, `shared` theo kind |
| `attachment-validator.spec.ts` | 8 | Whitelist, magic bytes, làm sạch tên file |
| `chat-storage.spec.ts` | 16 | Kiểm tra URL thuộc bucket (traversal, encode, query, fragment, backslash, origin khác) |
| `links.util.spec.ts` | 9 | Trích link (nhiều link, bỏ trùng, tối đa 10), nhận diện link listing |
| `cors.util.spec.ts` | 2 | `isAllowedOrigin` dùng chung cho `main.ts` và gateway |

`be/src/common/__tests__/common-utils.spec.ts` (6 test) có từ trước, chạy cùng bộ `src/common`. `AuthHarness` được thêm hook `open(configure)` tuỳ chọn, và các suite auth/KYC có sẵn vẫn pass.

### FE (Vitest + Testing Library, 16 file, 91 test)

- `src/components/chat/`: `message-bubble` (15), `message-composer` (15, gồm reply bar, chọn/gỡ file, chặn file quá lớn, gửi ảnh và file thành tin riêng, IME Enter), `location-picker` (6), `shared-media-panel` (6), `conversation-list` (4), `listing-preview-card` (3), `message-list` (3), `location-card` (2).
- `src/components/listing/contact-provider-button.test.tsx` (6): ẩn/hiện theo vai trò, anonymous sang `/login?redirect=`, đúng `targetUserId`, điều hướng `?c=...&listing=...`.
- `src/app/(main)/messages/page.test.tsx` (4): chọn conversation theo `?c=`, điền sẵn link listing một lần, bỏ `listing` khỏi URL.
- `src/hooks/use-chat-socket.test.tsx` (4), `src/lib/api/message-api.test.ts` (5), `src/lib/chat/{cache,format,links}.test.ts` (6, 4, 4), `src/lib/validators/message.test.ts` (4).

### Playwright E2E (`fe/e2e/chat.spec.ts`, `fe/playwright.config.ts`, `fe/e2e/global-setup.ts`)

Chạy trên dữ liệu seed của dev DB, hai browser context (traveler và provider); `webServer` tự khởi động BE và FE, `global-setup` làm nóng các route. 4 test:

1. Traveler mở listing, bấm "Liên hệ Provider", vào đúng chat, thấy link listing điền sẵn, gửi; provider nhận đúng một tin mới kèm card sản phẩm; trả lời, sửa, thu hồi cả hai phía thấy.
2. Gửi vị trí bằng picker (mock geolocation) và lịch sử link trong panel.
3. Gửi ảnh và file rồi thấy trong panel. Test này chỉ chạy khi `E2E_UPLOADS=1` (cần bucket Supabase `chat` thật), mặc định skip.
4. Nút liên hệ ẩn với provider; người chưa đăng nhập được chuyển tới `/login?redirect=<path>`.

Test 1 cũng bấm lại nút liên hệ từ cùng listing và thấy vào lại đúng conversation cũ. Trường hợp "listing khác của cùng provider" không có e2e riêng, được bảo đảm bởi test idempotent ở BE.

### Phụ thuộc test mới ở FE

`vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `@playwright/test`. Cài sau khi kiểm tra chưa có sẵn trong dự án (đã kiểm tra: chưa có).

## 9. Rủi ro và việc để sau

- File của tin đã xoá vẫn còn trong Storage. Dọn bằng job BullMQ là việc làm sau, nếu có yêu cầu pháp lý hoặc dung lượng.
- Bucket `chat` public: ai có URL đều xem được. Đã chấp nhận ở thiết kế. Nếu sau này cần riêng tư hơn, chuyển sang signed URL.
- Socket.IO nhiều instance cần Redis adapter. Hiện chạy một instance nên chưa làm.
- Luồng login hiện chưa xử lý `?redirect=` (`useLogin`/2FA luôn điều hướng theo role tới `/profile/*`), nên người chưa đăng nhập bấm "Liên hệ Provider" không quay lại trang listing sau khi login. Lỗi có sẵn từ trước, sửa ở một follow-up AUTH (cho `useAuthMutations.ts` nhận `redirect` cùng origin).
- Quy ước vị trí: toạ độ gửi theo WGS84, tin tĩnh, người nhận xem thấy đúng toạ độ lúc gửi.
