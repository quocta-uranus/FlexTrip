import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, Prisma, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ResendService } from '../../auth/services/resend.service';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import { RequestContext } from '../../../common/request-context';
import { CreateStaffDto, ListStaffQueryDto, UpdateStaffDto } from './dto/admin-staff.dto';

export const OPEN_BOOKING_STATUSES: BookingStatus[] = [BookingStatus.PENDING_APPROVAL, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS];
const INVITE_TTL_MS = 48 * 3600_000;

const STAFF_SELECT = {
  id: true, name: true, email: true, status: true,
  staffProfile: { select: { employeeCode: true, phone: true, regions: true, isActive: true } },
  providerSetupToken: { select: { usedAt: true } },
  authSessions: { orderBy: { lastUsedAt: 'desc' }, take: 1, select: { lastUsedAt: true } },
} satisfies Prisma.UserSelect;
type StaffRow = Prisma.UserGetPayload<{ select: typeof STAFF_SELECT }>;

const isStaff: Prisma.UserWhereInput = { roles: { some: { role: Role.STAFF } }, staffProfile: { isNot: null } };

const notFound = () => new NotFoundException({ code: 'STAFF_NOT_FOUND', message: 'Không tìm thấy nhân viên.' });

@Injectable()
export class AdminStaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly resend: ResendService,
    private readonly config: ConfigService,
  ) {}

  private setupUrl(token: string) {
    const base = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000').split(',')[0].trim();
    return `${base}/setup-password?token=${token}`;
  }

  private newToken() {
    const plain = randomBytes(32).toString('hex');
    return { plain, hash: createHash('sha256').update(plain).digest('hex'), expiresAt: new Date(Date.now() + INVITE_TTL_MS) };
  }

  private async counts(ids: string[]) {
    const groups = ids.length
      ? await this.prisma.booking.groupBy({ by: ['assignedStaffId', 'status'], where: { assignedStaffId: { in: ids } }, _count: { _all: true } })
      : [];
    return (id: string) => ({
      openAssignments: groups.filter((g) => g.assignedStaffId === id && OPEN_BOOKING_STATUSES.includes(g.status)).reduce((n, g) => n + g._count._all, 0),
      completedAssignments: groups.filter((g) => g.assignedStaffId === id && g.status === BookingStatus.COMPLETED).reduce((n, g) => n + g._count._all, 0),
    });
  }

  private toItem(u: StaffRow, c: { openAssignments: number; completedAssignments: number }) {
    const p = u.staffProfile!;
    return {
      id: u.id, name: u.name, email: u.email, phone: p.phone, employeeCode: p.employeeCode, regions: p.regions,
      isActive: p.isActive, userStatus: u.status, ...c,
      lastActiveAt: u.authSessions[0]?.lastUsedAt ?? null,
      passwordSet: Boolean(u.providerSetupToken?.usedAt),
    };
  }

  async getOne(id: string) {
    const u = await this.prisma.user.findFirst({ where: { id, ...isStaff }, select: STAFF_SELECT });
    if (!u) throw notFound();
    return this.toItem(u, (await this.counts([id]))(id));
  }

  async list(q: ListStaffQueryDto) {
    const search = q.search?.trim();
    const contains = (s: string) => ({ contains: s, mode: 'insensitive' as const });
    const where: Prisma.UserWhereInput = {
      ...isStaff,
      ...(q.region || q.isActive !== undefined
        ? { staffProfile: { is: { ...(q.region ? { regions: { has: q.region } } : {}), ...(q.isActive !== undefined ? { isActive: q.isActive } : {}) } } }
        : {}),
      ...(search
        ? { OR: [{ name: contains(search) }, { email: contains(search) }, { staffProfile: { is: { employeeCode: contains(search) } } }] }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, select: STAFF_SELECT, orderBy: { name: 'asc' }, ...skipTake(q) }),
      this.prisma.user.count({ where }),
    ]);
    const countOf = await this.counts(rows.map((r) => r.id));
    return paginate(rows.map((r) => this.toItem(r, countOf(r.id))), total, q);
  }

  async stats() {
    const [total, active, openAssignments, unassignedBookings] = await Promise.all([
      this.prisma.user.count({ where: isStaff }),
      this.prisma.user.count({ where: { ...isStaff, staffProfile: { is: { isActive: true } } } }),
      this.prisma.booking.count({ where: { assignedStaffId: { not: null }, status: { in: OPEN_BOOKING_STATUSES } } }),
      this.prisma.booking.count({ where: { assignedStaffId: null, status: { in: OPEN_BOOKING_STATUSES } } }),
    ]);
    return { total, active, openAssignments, unassignedBookings };
  }

  async create(dto: CreateStaffDto, ctx: RequestContext) {
    if (await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } }))
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email đã được sử dụng.' });
    if (await this.prisma.staffProfile.findUnique({ where: { employeeCode: dto.employeeCode }, select: { id: true } }))
      throw new ConflictException({ code: 'EMPLOYEE_CODE_TAKEN', message: 'Mã nhân viên đã tồn tại.' });
    const token = this.newToken();
    const unusablePassword = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
    const userId = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email, name: dto.name, phone: dto.phone, password: unusablePassword,
          status: UserStatus.ACTIVE, emailVerifiedAt: new Date(),
          roles: { create: { role: Role.STAFF } },
          staffProfile: { create: { employeeCode: dto.employeeCode, phone: dto.phone, regions: dto.regions } },
          providerSetupToken: { create: { tokenHash: token.hash, expiresAt: token.expiresAt } },
        },
      });
      await this.audit.log(tx, ctx, {
        action: 'STAFF_CREATED', entityType: 'User', entityId: user.id,
        after: { email: dto.email, name: dto.name, employeeCode: dto.employeeCode, regions: dto.regions },
      });
      return user.id;
    });
    const emailSent = await this.resend.sendStaffInvite(dto.email, dto.name, this.setupUrl(token.plain));
    return { staff: await this.getOne(userId), emailSent };
  }

  async update(id: string, dto: UpdateStaffDto, ctx: RequestContext) {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findFirst({ where: { id, ...isStaff }, select: STAFF_SELECT });
      if (!before) throw notFound();
      if (dto.employeeCode && dto.employeeCode !== before.staffProfile!.employeeCode &&
          (await tx.staffProfile.findUnique({ where: { employeeCode: dto.employeeCode }, select: { id: true } })))
        throw new ConflictException({ code: 'EMPLOYEE_CODE_TAKEN', message: 'Mã nhân viên đã tồn tại.' });
      const { name, isActive, ...profile } = dto;
      await tx.user.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(profile.phone !== undefined ? { phone: profile.phone } : {}),
          staffProfile: { update: { ...profile, ...(isActive !== undefined ? { isActive } : {}) } },
        },
      });
      await this.audit.log(tx, ctx, {
        action: 'STAFF_UPDATED', entityType: 'User', entityId: id,
        before: { name: before.name, ...before.staffProfile }, after: dto,
      });
    });
    return this.getOne(id);
  }

  async resendInvite(id: string, ctx: RequestContext) {
    const staff = await this.getOne(id);
    if (staff.passwordSet)
      throw new ConflictException({ code: 'PASSWORD_ALREADY_SET', message: 'Nhân viên đã tạo mật khẩu.' });
    const token = this.newToken();
    await this.prisma.$transaction(async (tx) => {
      await tx.providerSetupToken.upsert({
        where: { userId: id },
        create: { userId: id, tokenHash: token.hash, expiresAt: token.expiresAt },
        update: { tokenHash: token.hash, expiresAt: token.expiresAt, usedAt: null },
      });
      await this.audit.log(tx, ctx, { action: 'STAFF_INVITE_RESENT', entityType: 'User', entityId: id });
    });
    return { emailSent: await this.resend.sendStaffInvite(staff.email, staff.name, this.setupUrl(token.plain)) };
  }

  async assertStaffAvailable(tx: Prisma.TransactionClient, staffId: string) {
    const ok = await tx.user.findFirst({
      where: { id: staffId, status: UserStatus.ACTIVE, roles: { some: { role: Role.STAFF } }, staffProfile: { is: { isActive: true } } },
      select: { id: true, name: true, staffProfile: { select: { employeeCode: true } } },
    });
    if (!ok) throw new BadRequestException({ code: 'STAFF_NOT_AVAILABLE', message: 'Nhân viên không tồn tại hoặc đang ngừng hoạt động.' });
    return ok;
  }
}
