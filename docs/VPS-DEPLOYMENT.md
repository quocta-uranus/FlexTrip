# FlexTrip — VPS Deployment Guide

## Thông tin VPS

| | |
|---|---|
| **IP** | `180.93.115.123` |
| **OS** | Ubuntu 22.04 LTS x86_64 |
| **Cấu hình** | 2 vCPU / 2 GB RAM / 30 GB SSD |
| **User** | `root` |

---

## Kiến trúc

```
Internet
    │
    ▼
Nginx :80
    │  proxy_pass
    ▼
NestJS (PM2) :3001
    │
    ├── PostgreSQL :5432  (Docker, chỉ expose nội bộ)
    └── Redis      :6379  (Docker, chỉ expose nội bộ)
```

---

## URL

| | |
|---|---|
| **API Base** | `https://api.flextrip.asia` |
| **Swagger Docs** | `https://api.flextrip.asia/api/docs` |

---

## SSH vào VPS

```bash
ssh root@180.93.115.123
```

---

## Cấu trúc thư mục trên VPS

```
/opt/flextrip/
├── docker-compose.yml   # PostgreSQL + Redis
└── be/                  # NestJS source code
    ├── dist/            # build output
    ├── prisma/
    └── .env             # production env (không commit)
```

---

## Quy trình deploy khi có code mới

### Bước 1 — Upload code từ máy local lên VPS

Chạy trên máy local (Mac):

```bash
rsync -avz --exclude='node_modules' --exclude='.env' --exclude='dist' \
  /Users/leoaq/www/FlexTrip/be/ root@180.93.115.123:/opt/flextrip/be/
```

### Bước 2 — SSH vào VPS và deploy

```bash
ssh root@180.93.115.123
cd /opt/flextrip/be
npm ci
npm run build
npx prisma migrate deploy
pm2 restart flextrip-be
```

### Bước 3 — Kiểm tra

```bash
pm2 status
```

Status phải là `online`.

---

## Các lệnh thường dùng trên VPS

```bash
# Xem logs BE realtime
pm2 logs flextrip-be

# Restart BE
pm2 restart flextrip-be

# Xem trạng thái BE
pm2 status

# Xem trạng thái PostgreSQL + Redis
docker compose -f /opt/flextrip/docker-compose.yml ps

# Restart PostgreSQL + Redis
docker compose -f /opt/flextrip/docker-compose.yml restart
```

---

## Cấu hình FE để connect vào BE

Trong file `fe/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://api.flextrip.asia
```

---

## File .env production (trên VPS)

File nằm tại `/opt/flextrip/be/.env`. Các biến quan trọng:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://flextrip:Flextrip@2026!@localhost:5432/flextrip_db?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
APP_URL=https://api.flextrip.asia
```

> Không commit file `.env` lên git.

---

## Tự động restart khi VPS reboot

- **PM2** đã được cấu hình `pm2 startup` — BE tự restart khi reboot
- **Docker** dùng `restart: unless-stopped` — PostgreSQL và Redis tự restart khi reboot

---

## Auto Deploy bằng GitHub Actions (TODO)

Thay vì deploy tay mỗi lần, có thể setup GitHub Actions để **tự động deploy mỗi khi push lên branch `main`**.

### Chuẩn bị cần làm

1. **Tạo SSH key riêng cho GitHub Actions** (không dùng key cá nhân):

```bash
# Chạy trên máy local
ssh-keygen -t ed25519 -C "github-actions-flextrip" -f ~/.ssh/flextrip_deploy
```

Sẽ tạo ra 2 file:
- `~/.ssh/flextrip_deploy` → private key (thêm vào GitHub Secrets)
- `~/.ssh/flextrip_deploy.pub` → public key (thêm vào VPS)

2. **Thêm public key vào VPS:**

```bash
ssh root@180.93.115.123
echo "<nội dung file flextrip_deploy.pub>" >> ~/.ssh/authorized_keys
```

3. **Thêm Secrets vào GitHub repo** (Settings → Secrets and variables → Actions):

| Secret | Giá trị |
|---|---|
| `VPS_HOST` | `180.93.115.123` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | nội dung file `~/.ssh/flextrip_deploy` |

4. **Yêu cầu Claude tạo file workflow** `.github/workflows/deploy-be.yml`

Sau khi setup xong, mỗi lần merge PR vào `main` → GitHub Actions tự động SSH vào VPS và deploy, không cần làm tay nữa.

---

## Khi có domain (bước tiếp theo)

1. Trỏ DNS record `A` của domain về IP `180.93.115.123`
2. SSH vào VPS, cài SSL:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.flextrip.asia
```

3. Cập nhật `APP_URL` trong `/opt/flextrip/be/.env`:

```env
APP_URL=https://api.flextrip.asia
```

4. Cập nhật `NEXT_PUBLIC_API_URL` trong `fe/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://api.flextrip.asia
```

5. Restart BE:

```bash
pm2 restart flextrip-be
```
