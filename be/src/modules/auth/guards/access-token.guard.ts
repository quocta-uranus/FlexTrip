import {
  CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../common/redis/redis.module';
import { blockedKey } from '../../../common/redis/auth-blocklist';

export interface AuthenticatedRequest extends Request {
  authUserId: string;
  authSessionId?: string;
  /** Set by RolesGuard from the database, never from the JWT. */
  authRoles?: Role[];
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();
    let payload: { sub?: unknown; sid?: unknown };
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException();
    }
    if (typeof payload.sub !== 'string') throw new UnauthorizedException();
    if (await this.redis.exists(blockedKey(payload.sub)))
      throw new UnauthorizedException({ code: 'ACCOUNT_SUSPENDED', message: 'Tài khoản đã bị khoá.' });
    request.authUserId = payload.sub;
    if (typeof payload.sid === 'string') request.authSessionId = payload.sid;
    return true;
  }
}
