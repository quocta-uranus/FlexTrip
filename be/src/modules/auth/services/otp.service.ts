import { HttpException, HttpStatus, Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../common/redis/redis.module';

const TTL_SECONDS = 600; // 10 minutes
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_SECONDS = 15 * 60;

@Injectable()
export class OtpService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async generate(namespace: string, key: string): Promise<string> {
    const code = Math.floor(100_000 + Math.random() * 900_000).toString();
    await this.redis.set(`otp:${namespace}:${key}`, code, 'EX', TTL_SECONDS);
    return code;
  }

  async verify(namespace: string, key: string, code: string): Promise<boolean> {
    const stored = await this.redis.get(`otp:${namespace}:${key}`);
    if (!stored || stored !== code) return false;
    await this.redis.del(`otp:${namespace}:${key}`);
    return true;
  }

  // Đếm sai trong Redis (không dùng Map trong RAM) để khoá còn hiệu lực khi chạy nhiều instance hoặc khởi động lại.
  // Mỗi key đếm riêng, ví dụ theo tài khoản và theo cặp tài khoản+IP, nên đổi IP không né được khoá của tài khoản.
  async assertNotLocked(keys: string[]): Promise<void> {
    const counts = await Promise.all(keys.map((k) => this.redis.get(`authfail:${k}`)));
    const worst = Math.max(...counts.map((c) => Number(c ?? 0)));
    if (worst < MAX_FAILED_ATTEMPTS) return;
    const ttls = await Promise.all(keys.map((k) => this.redis.ttl(`authfail:${k}`)));
    const minutes = Math.max(1, Math.ceil(Math.max(...ttls, 0) / 60));
    throw new HttpException(
      { code: 'ACCOUNT_LOCKED', message: `Bạn đã nhập sai quá ${MAX_FAILED_ATTEMPTS} lần. Vui lòng thử lại sau ${minutes} phút.` },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  async recordFailure(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map(async (k) => {
        const key = `authfail:${k}`;
        const count = await this.redis.incr(key);
        if (count === 1 || count === MAX_FAILED_ATTEMPTS) await this.redis.expire(key, LOCK_SECONDS);
      }),
    );
  }

  async clearFailures(keys: string[]): Promise<void> {
    await this.redis.del(...keys.map((k) => `authfail:${k}`));
  }

  async canResend(namespace: string, key: string): Promise<boolean> {
    const ttl = await this.redis.ttl(`otp:${namespace}:${key}`);
    if (ttl < 0) return true; // key không tồn tại hoặc đã hết hạn
    return ttl <= TTL_SECONDS - RESEND_COOLDOWN_SECONDS;
  }
}
