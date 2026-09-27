import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../common/redis/redis.module';

const TTL_SECONDS = 600; // 10 minutes
const RESEND_COOLDOWN_SECONDS = 60;

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

  async canResend(namespace: string, key: string): Promise<boolean> {
    const ttl = await this.redis.ttl(`otp:${namespace}:${key}`);
    if (ttl < 0) return true; // key không tồn tại hoặc đã hết hạn
    return ttl <= TTL_SECONDS - RESEND_COOLDOWN_SECONDS;
  }
}
