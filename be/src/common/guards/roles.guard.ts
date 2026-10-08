import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { DENY_ROLES_KEY } from '../decorators/deny-roles.decorator';
import type { AuthenticatedRequest } from '../../modules/auth/guards/access-token.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const denied = this.reflector.getAllAndOverride<Role[] | undefined>(DENY_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length && !denied?.length) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // Roles come from the DB, not the JWT: a role revoked after login must stop working now.
    const user = await this.prisma.user.findUnique({
      where: { id: request.authUserId },
      select: { status: true, emailVerifiedAt: true, roles: { select: { role: true } } },
    });
    if (!user || user.status !== UserStatus.ACTIVE || !user.emailVerifiedAt)
      throw new ForbiddenException({ code: 'ACCOUNT_NOT_ELIGIBLE', message: 'Tài khoản không đủ điều kiện.' });
    const roles = user.roles.map((r) => r.role);
    if (denied?.some((role) => roles.includes(role)))
      throw new ForbiddenException({ code: 'ROLE_NOT_ALLOWED', message: 'Vai trò này không được phép thực hiện thao tác.' });
    if (required?.length && !roles.some((r) => required.includes(r)))
      throw new ForbiddenException({ code: 'INSUFFICIENT_ROLE', message: 'Bạn không có quyền thực hiện thao tác này.' });
    request.authRoles = roles;
    return true;
  }
}
