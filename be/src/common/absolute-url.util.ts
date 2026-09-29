import { Request } from 'express';

/**
 * Resolve một path tương đối ("/uploads/xxx.jpg") thành URL tuyệt đối.
 *
 * Thứ tự ưu tiên:
 *  1. Đã là http(s) → trả nguyên.
 *  2. APP_URL env → nối vào (vd khi deploy CDN/domain riêng).
 *  3. Origin của request hiện tại (`req.headers['x-forwarded-host']` ??
 *     `req.headers.host`) + protocol → đảm bảo URL trùng domain FE đang gọi.
 *
 * @example
 *   toAbsoluteUrl('/uploads/avatar.jpg', req) // http(s)://<APP_URL or host>/uploads/avatar.jpg
 */
export function toAbsoluteUrl(
  path: string | null | undefined,
  req?: Request,
): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (!path.startsWith('/')) return path;

  // Ưu tiên APP_URL từ env (do deploy control hoàn toàn)
  if (process.env.APP_URL) {
    return `${process.env.APP_URL.replace(/\/$/, '')}${path}`;
  }

  // Fallback: dùng host mà client đang gọi (qua reverse proxy hoặc trực tiếp)
  if (req) {
    const fwdProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0];
    const fwdHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0];
    const host = fwdHost || req.headers.host;
    const proto = fwdProto || req.protocol;
    if (host) return `${proto}://${host}${path}`;
  }

  // Last resort (chỉ khi không có req — ví dụ background job)
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}${path}`;
}
