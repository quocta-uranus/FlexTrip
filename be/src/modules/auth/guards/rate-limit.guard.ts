import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

interface RateWindow {
  count: number;
  resetsAt: number;
}

abstract class AuthRateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, RateWindow>();
  protected abstract readonly limit: number;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    const address = request.socket.remoteAddress ?? 'unknown';
    const current = this.windows.get(address);
    if (!current || current.resetsAt <= now) {
      this.windows.set(address, { count: 1, resetsAt: now + 60_000 });
      return true;
    }
    if (current.count >= this.limit) {
      throw new HttpException(
        { code: 'RATE_LIMIT_EXCEEDED' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    current.count += 1;
    return true;
  }
}

@Injectable()
export class RegisterRateLimitGuard extends AuthRateLimitGuard {
  protected readonly limit = 5;
}

@Injectable()
export class ForgotPasswordRateLimitGuard extends AuthRateLimitGuard {
  protected readonly limit = 5;
}

@Injectable()
export class ResetPasswordRateLimitGuard extends AuthRateLimitGuard {
  protected readonly limit = 10;
}
