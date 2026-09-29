import {
  BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { Redis } from 'ioredis';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { REDIS_CLIENT } from '../../../common/redis/redis.module';
import { BLOCK_TTL_SECONDS, blockedKey } from '../../../common/redis/auth-blocklist';
import { Paginated, paginate, skipTake } from '../../../common/dto/pagination.dto';
import { RequestContext } from '../../../common/request-context';
import { ListUsersQueryDto, SuspendUserDto, UnsuspendUserDto } from './dto/admin-users.dto';

const USER_LIST_SELECT = {
  id: true, name: true, email: true, phone: true, avatarUrl: true, status: true,
  isKycVerified: true, suspensionReason: true, suspendedAt: true, createdAt: true,
  roles: { select: { role: true } },
  kycApplications: { orderBy: { createdAt: 'desc' as const }, take: 1, select: { status: true } },
  authSessions: { orderBy: { lastUsedAt: 'desc' as const }, take: 1, select: { lastUsedAt: true } },
  _count: { select: { bookings: true } },
} satisfies Prisma.UserSelect;

type UserListRow = Prisma.UserGetPayload<{ select: typeof USER_LIST_SELECT }>;

export interface AdminUserItem {
  id: string; name: string; email: string; phone: string | null; avatarUrl: string | null;
  roles: Role[]; status: UserStatus; kycStatus: string | null; isKycVerified: boolean;
  bookingsCount: number; suspensionReason: string | null; suspendedAt: Date | null;
  createdAt: Date; lastActiveAt: Date | null;
}

const STATUS_SELECT = { id: true, status: true, suspendedAt: true, suspensionReason: true } satisfies Prisma.UserSelect;

function toItem(u: UserListRow): AdminUserItem {
  return {
    id: u.id, name: u.name, email: u.email, phone: u.phone, avatarUrl: u.avatarUrl,
    roles: u.roles.map((r) => r.role), status: u.status,
    kycStatus: u.kycApplications[0]?.status ?? null, isKycVerified: u.isKycVerified,
    bookingsCount: u._count.bookings, suspensionReason: u.suspensionReason, suspendedAt: u.suspendedAt,
    createdAt: u.createdAt, lastActiveAt: u.authSessions[0]?.lastUsedAt ?? null,
  };
}

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async list(q: ListUsersQueryDto): Promise<Paginated<AdminUserItem>> {
    const search = q.search?.trim();
    const where: Prisma.UserWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.role ? { roles: { some: { role: q.role } } } : {}),
      ...(search
        ? { OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { id: search },
          ] }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, select: USER_LIST_SELECT, orderBy: { createdAt: 'desc' }, ...skipTake(q) }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(rows.map(toItem), total, q);
  }

  async stats() {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const [byStatus, newThisMonth] = await Promise.all([
      this.prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    ]);
    const count = (s: UserStatus) => byStatus.find((r) => r.status === s)?._count._all ?? 0;
    return {
      total: byStatus.reduce((n, r) => n + r._count._all, 0),
      active: count(UserStatus.ACTIVE),
      suspended: count(UserStatus.SUSPENDED),
      disabled: count(UserStatus.DISABLED),
      newThisMonth,
    };
  }

  async detail(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_LIST_SELECT });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Không tìm thấy người dùng.' });
    const recentAudit = await this.prisma.auditLog.findMany({
      where: { entityType: 'User', entityId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { actor: { select: { id: true, name: true, email: true } } },
    });
    return { ...toItem(user), recentAudit };
  }

  async suspend(id: string, dto: SuspendUserDto, ctx: RequestContext) {
    if (id === ctx.actorId)
      throw new BadRequestException({ code: 'CANNOT_SUSPEND_SELF', message: 'Bạn không thể tự khoá tài khoản của mình.' });
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id }, include: { roles: true } });
      if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Không tìm thấy người dùng.' });
      if (user.roles.some((r) => r.role === Role.ADMIN))
        throw new ForbiddenException({ code: 'CANNOT_SUSPEND_ADMIN', message: 'Không thể khoá tài khoản quản trị viên.' });
      const now = new Date();
      const { count } = await tx.user.updateMany({
        where: { id, status: UserStatus.ACTIVE },
        data: { status: UserStatus.SUSPENDED, suspendedAt: now, suspensionReason: dto.reason, refreshToken: null },
      });
      if (count === 0)
        throw new ConflictException({ code: 'USER_NOT_ACTIVE', message: 'Chỉ có thể khoá tài khoản đang hoạt động.' });
      const revoked = await tx.authSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: now } });
      const after = await tx.user.findUniqueOrThrow({ where: { id }, select: STATUS_SELECT });
      await this.audit.log(tx, ctx, {
        action: 'USER_SUSPENDED', entityType: 'User', entityId: id,
        before: { status: user.status }, after: { ...after, revokedSessions: revoked.count },
      });
      return after;
    });
    // Only after commit, so a rolled-back suspension never blocks the user.
    await this.redis.set(blockedKey(id), '1', 'EX', BLOCK_TTL_SECONDS);
    return result;
  }

  async unsuspend(id: string, dto: UnsuspendUserDto, ctx: RequestContext) {
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id }, select: STATUS_SELECT });
      if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Không tìm thấy người dùng.' });
      const { count } = await tx.user.updateMany({
        where: { id, status: UserStatus.SUSPENDED },
        data: { status: UserStatus.ACTIVE, suspendedAt: null, suspensionReason: null },
      });
      if (count === 0)
        throw new ConflictException({ code: 'USER_NOT_SUSPENDED', message: 'Tài khoản không ở trạng thái bị khoá.' });
      const after = await tx.user.findUniqueOrThrow({ where: { id }, select: STATUS_SELECT });
      await this.audit.log(tx, ctx, {
        action: 'USER_UNSUSPENDED', entityType: 'User', entityId: id,
        before: user, after: { ...after, note: dto.note ?? null },
      });
      return after;
    });
    await this.redis.del(blockedKey(id));
    return result;
  }
}
