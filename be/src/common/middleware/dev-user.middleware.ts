import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request } from 'express';

/**
 * Dev-only middleware: gán userId cố định vào request vì auth module
 * đã được loại bỏ. 3 profile hard-coded ở FE dùng chung 1 userId để BE
 * trả về cùng dữ liệu cho cả Traveler / Provider / Admin.
 */
@Injectable()
export class DevUserMiddleware implements NestMiddleware {
  use(req: Request, _next: any) {
    (req as any).user = { userId: 'dev-user' };
  }
}
