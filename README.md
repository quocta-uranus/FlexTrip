# FlexTrip — Hướng dẫn chạy source

## Tổng quan kiến trúc

```
fe/   →  Next.js 16 + TypeScript + TailwindCSS   (port 3000)
be/   →  NestJS 12 + TypeScript + Prisma 7        (port 3001)
         PostgreSQL 16                             (port 5432)
         Redis 7                                   (port 6379)
```

---

## Yêu cầu môi trường

| Công cụ        | Phiên bản     | Ghi chú                       |
|----------------|---------------|-------------------------------|
| Node.js        | **20.x**      | bắt buộc — dùng `nvm use 20` |
| npm            | 10.x          | đi kèm Node 20                |
| Docker Desktop | 24+           | chạy PostgreSQL + Redis local  |
| Git            | bất kỳ        |                               |

> **Cài Node đúng version (nếu chưa có nvm):**
> ```bash
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
> # Sau đó mở terminal mới, rồi:
> nvm install 20
> nvm use 20
> ```

---

## Bước 1 — Clone repo

```bash
git clone <repo-url> FlexTrip
cd FlexTrip
```

---

## Bước 2 — Khởi động Database & Redis

```bash
# Khởi động PostgreSQL + Redis qua Docker
docker compose up -d --force-recreate

# Kiểm tra healthy chưa (chờ STATUS = healthy)
docker compose ps
```

> **Lưu ý:** Nếu máy đang chạy Docker project khác dùng port 5432/6379, cần dừng chúng trước:
> `docker stop <tên_container_cũ>`

---

## Bước 3 — Backend (NestJS)

Mở **terminal 1**, chạy theo thứ tự:

```bash
nvm use 20
cd be

# 1. Cài dependencies
npm install --legacy-peer-deps

# 2. Tạo file môi trường
cp env.example .env
# Mở .env, điền 2 giá trị JWT secret (chuỗi bất kỳ dài >= 32 ký tự):
#   JWT_ACCESS_SECRET=...
#   JWT_REFRESH_SECRET=...
# Các giá trị còn lại (DATABASE_URL, REDIS_HOST...) giữ nguyên mặc định là được.

# 3. Chạy database migration (lần đầu)
npx prisma migrate dev --name init

# 4. Start server
npm run start:dev
```

Server lên tại: `http://localhost:3001`  
Swagger API docs: `http://localhost:3001/api/docs`

---

## Bước 4 — Frontend (Next.js)

Mở **terminal 2**, chạy:

```bash
nvm use 20
cd fe

# 1. Cài dependencies
npm install

# 2. Tạo file môi trường
cp env.example .env.local
# Không cần chỉnh gì, mặc định đã trỏ đúng vào BE port 3001.

# 3. Start dev server
npm run dev
```

App lên tại: `http://localhost:3000`

---

## Tóm tắt nhanh — lần đầu chạy

```
Terminal 0:  docker compose up -d --force-recreate

Terminal 1:  nvm use 20 && cd be
             npm install --legacy-peer-deps
             cp env.example .env   ← điền JWT secrets
             npx prisma migrate dev --name init
             npm run start:dev

Terminal 2:  nvm use 20 && cd fe
             npm install
             cp env.example .env.local
             npm run dev
```

---

## Scripts hay dùng

### Backend (`be/`)

| Lệnh                     | Mô tả                         |
|--------------------------|-------------------------------|
| `npm run start:dev`      | Dev server (hot-reload)       |
| `npm run build`          | Build production              |
| `npm run start:prod`     | Chạy bản production           |
| `npm run test`           | Unit tests                    |
| `npx prisma migrate dev` | Tạo migration khi đổi schema  |
| `npx prisma studio`      | Giao diện web xem dữ liệu DB  |

### Frontend (`fe/`)

| Lệnh            | Mô tả                   |
|-----------------|-------------------------|
| `npm run dev`   | Dev server (hot-reload) |
| `npm run build` | Build production        |
| `npm run lint`  | Kiểm tra lỗi lint       |

### Xử lý lỗi Tailwind "Cannot find native binding"

Nếu thấy lỗi `Cannot find module '@tailwindcss/oxide-darwin-arm64'` khi vào localhost:3000, chạy:

```bash
# Trong thư mục fe/
rm -rf .next
npm run dev
```

Nguyên nhân: cache `.next` cũ (từ lần install sai Node version) còn giữ binary thiếu. Xóa là hết.

### Docker

| Lệnh                           | Mô tả                        |
|--------------------------------|------------------------------|
| `docker compose up -d`         | Khởi động PostgreSQL + Redis |
| `docker compose down`          | Tắt containers               |
| `docker compose down -v`       | Tắt và xóa toàn bộ data     |
| `docker compose logs -f`       | Xem logs realtime            |

---

## Cấu trúc thư mục

```
FlexTrip/
├── docker-compose.yml
├── fe/                         # Next.js 16 (App Router)
│   └── src/
│       ├── app/
│       │   ├── (auth)/         # login, register
│       │   └── (main)/         # search, listings, bookings...
│       ├── components/
│       ├── lib/
│       │   ├── api/            # fetch wrapper gọi BE
│       │   └── validators/     # Zod schemas
│       ├── store/              # Zustand (auth, search)
│       └── types/
└── be/                         # NestJS 12
    ├── prisma/
    │   └── schema.prisma       # DB schema (User, Listing, Booking...)
    └── src/
        ├── modules/
        │   ├── auth/           # AUTH-01..06
        │   ├── users/
        │   ├── listings/       # LIST
        │   ├── bookings/       # BOOK
        │   ├── payments/       # PAY
        │   ├── messages/       # MSG
        │   ├── notifications/  # NOTI
        │   ├── contracts/      # CONTR
        │   └── search/         # SRC
        ├── common/             # Guards, Interceptors, Decorators
        └── prisma/             # PrismaService (global module)
```

---

## Git workflow

Branch chính:
- `main` — production, chỉ merge từ `develop` khi release
- `develop` — branch phát triển chính, **tất cả member đều checkout từ đây**

Quy trình làm việc:
```bash
# Lấy code mới nhất từ develop
git checkout develop
git pull origin develop

# Tạo branch cho feature/bugfix của mình
git checkout -b feat/BOOK-03
# hoặc
git checkout -b fix/AUTH-02

# Sau khi xong thì tạo Pull Request vào develop, không push thẳng lên develop
```

Đặt tên branch theo use case ID: `feat/<ID>` hoặc `fix/<ID>` (ví dụ: `feat/LIST-01`, `fix/AUTH-04`).

---

## Workflow sau khi pull code từ team member

Khi pull code về mà member có thêm bảng / cột mới trong Prisma:

```bash
git pull origin develop

cd be

# Áp các migration mới vào DB local (KHÔNG tạo migration mới)
npx prisma migrate deploy

# Regenerate Prisma Client để TypeScript nhận kiểu mới
npx prisma generate
```

> **Phân biệt 2 lệnh migration:**
>
> | Lệnh | Dùng khi nào |
> |------|-------------|
> | `npx prisma migrate deploy` | Pull code về — áp migration **của người khác** |
> | `npx prisma migrate dev --name <ten>` | **Bạn** vừa sửa `schema.prisma` — tạo migration mới |

**Nếu DB local bị lỗi / muốn reset sạch:**

```bash
# Xóa toàn bộ data → chạy lại mọi migration từ đầu
npx prisma migrate reset
```

> Cảnh báo: lệnh này xóa hết data local. Chỉ dùng khi dev.

---

## Lưu ý cho team

- **Node 20 bắt buộc** — `nvm use 20` trước khi chạy bất kỳ lệnh nào. Cả `fe/` và `be/` đều có `.nvmrc` nên `nvm use` (không cần ghi số) cũng chạy được.
- **`--legacy-peer-deps`** cho BE — do một số package chưa khai báo peer dep đầy đủ, cần flag này khi `npm install`.
- **Prisma migration** — mỗi khi sửa `schema.prisma`, chạy `npx prisma migrate dev --name <ten>` rồi commit cả file migration vào git. Khi pull code của người khác, dùng `npx prisma migrate deploy`.
- **`.env` không commit** — file `.env` và `.env.local` đã có trong `.gitignore`. Dùng `env.example` làm template khi onboard member mới.
- **Swagger** — BE expose docs tại `http://localhost:3001/api/docs`. FE dev nên xem đây trước khi gọi API.

---

## Cập nhật cho máy bị xung đột PostgreSQL cổng 5432

Nếu PostgreSQL cài trực tiếp trên Windows đang sử dụng cổng 5432 và không thể
dừng service đó, giữ nguyên `docker-compose.yml` của nhóm và đổi riêng
`DATABASE_URL` trong `be/.env` sang cổng 5433:

```env
DATABASE_URL="postgresql://flextrip:flextrip@localhost:5433/flextrip_db?schema=public"
```

Sau đó chạy tại thư mục gốc:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev-up.ps1
```

Script đọc cổng từ `be/.env`. Với cổng 5433, script tự kết hợp
`docker-compose.yml` và `docker-compose.local.yml`, chờ PostgreSQL cùng Redis
healthy, chạy `prisma migrate deploy` và tạo lại Prisma Client. Cấu hình mặc
định 5432 của nhóm không bị thay đổi.

`POSTGRES_PASSWORD` chỉ khởi tạo mật khẩu khi volume được tạo lần đầu. Nếu
volume cũ dùng mật khẩu khác, đồng bộ role mà không xóa dữ liệu:

```powershell
docker exec flextrip_postgres psql -U flextrip -d flextrip_db -c "ALTER ROLE flextrip WITH LOGIN PASSWORD 'flextrip';"
powershell -ExecutionPolicy Bypass -File .\scripts\dev-up.ps1
```

Sau khi pull migration của thành viên khác, dùng `prisma migrate deploy`; chỉ
dùng `prisma migrate dev --name <ten>` khi chính bạn thay đổi schema và cần tạo
migration mới.

Không chạy các lệnh sau nếu cần giữ dữ liệu local:

```text
docker compose down -v
npx prisma migrate reset
DROP
DELETE
TRUNCATE
```

Script không chạy các lệnh xóa trên và vẫn sử dụng volume `postgres_data` hiện
có. File backup `*.dump` được Git bỏ qua để tránh commit dữ liệu local.
