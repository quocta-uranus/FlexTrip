import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import { normalizeVi } from '../../../common/text.util';
import { RequestContext } from '../../../common/request-context';
import { AdminStaffService, OPEN_BOOKING_STATUSES } from './admin-staff.service';
import { AssignStaffDto, ListAssignableBookingsQueryDto } from './dto/admin-staff-rules.dto';

const BOOKING_SELECT = {
  id: true, status: true, startDate: true, endDate: true, assignedStaffId: true,
  listing: { select: { id: true, title: true, location: true } },
  traveler: { select: { id: true, name: true } },
  assignedStaff: { select: { id: true, name: true, staffProfile: { select: { employeeCode: true } } } },
} satisfies Prisma.BookingSelect;
type BookingRow = Prisma.BookingGetPayload<{ select: typeof BOOKING_SELECT }>;

const toItem = (b: BookingRow) => ({
  id: b.id, status: b.status, startDate: b.startDate, endDate: b.endDate, listing: b.listing, traveler: b.traveler,
  assignedStaff: b.assignedStaff
    ? { id: b.assignedStaff.id, name: b.assignedStaff.name, employeeCode: b.assignedStaff.staffProfile?.employeeCode ?? null }
    : null,
});

@Injectable()
export class AdminStaffBookingsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly staff: AdminStaffService) {}

  async list(q: ListAssignableBookingsQueryDto) {
    const search = q.search?.trim();
    const contains = (s: string) => ({ contains: s, mode: 'insensitive' as const });
    const where: Prisma.BookingWhereInput = {
      ...(q.assigned === true ? { assignedStaffId: { not: null } } : q.assigned === false ? { assignedStaffId: null } : {}),
      ...(q.staffId ? { assignedStaffId: q.staffId } : {}),
      ...(q.status ? { status: q.status } : { status: { in: OPEN_BOOKING_STATUSES } }),
      ...(search
        ? { OR: [{ id: search }, { listing: { title: contains(search) } }, { listing: { location: contains(search) } }] }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({ where, select: BOOKING_SELECT, orderBy: { startDate: 'asc' }, ...skipTake(q) }),
      this.prisma.booking.count({ where }),
    ]);
    return paginate(rows.map(toItem), total, q);
  }

  private async loadAssignable(tx: Prisma.TransactionClient, id: string) {
    const b = await tx.booking.findUnique({ where: { id }, select: BOOKING_SELECT });
    if (!b) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Không tìm thấy booking.' });
    if (!OPEN_BOOKING_STATUSES.includes(b.status))
      throw new ConflictException({ code: 'BOOKING_NOT_ASSIGNABLE', message: `Booking ở trạng thái ${b.status} không thể phân công.` });
    return b;
  }

  async assign(id: string, dto: AssignStaffDto, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const b = await this.loadAssignable(tx, id);
      await this.staff.assertStaffAvailable(tx, dto.staffId);
      const updated = await tx.booking.update({ where: { id }, data: { assignedStaffId: dto.staffId }, select: BOOKING_SELECT });
      await this.audit.log(tx, ctx, {
        action: 'BOOKING_STAFF_ASSIGNED', entityType: 'Booking', entityId: id,
        before: { assignedStaffId: b.assignedStaffId }, after: { assignedStaffId: dto.staffId },
      });
      return toItem(updated);
    });
  }

  async autoAssign(id: string, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const b = await this.loadAssignable(tx, id);
      const rules = await tx.staffAssignmentRule.findMany({
        where: {
          isActive: true,
          staff: { status: UserStatus.ACTIVE, roles: { some: { role: Role.STAFF } }, staffProfile: { is: { isActive: true } } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });
      const location = normalizeVi(b.listing.location);
      const rule = rules.find((r) => location.includes(normalizeVi(r.region)));
      if (!rule)
        throw new UnprocessableEntityException({ code: 'NO_MATCHING_RULE', message: 'Không có rule phân công nào khớp với khu vực của booking.' });
      const updated = await tx.booking.update({ where: { id }, data: { assignedStaffId: rule.staffId }, select: BOOKING_SELECT });
      await this.audit.log(tx, ctx, {
        action: 'BOOKING_STAFF_AUTO_ASSIGNED', entityType: 'Booking', entityId: id,
        before: { assignedStaffId: b.assignedStaffId }, after: { assignedStaffId: rule.staffId, ruleId: rule.id },
      });
      return { booking: toItem(updated), rule: { id: rule.id, name: rule.name } };
    });
  }

  async unassign(id: string, ctx: RequestContext) {
    return this.prisma.$transaction(async (tx) => {
      const b = await this.loadAssignable(tx, id);
      const updated = await tx.booking.update({ where: { id }, data: { assignedStaffId: null }, select: BOOKING_SELECT });
      await this.audit.log(tx, ctx, {
        action: 'BOOKING_STAFF_UNASSIGNED', entityType: 'Booking', entityId: id,
        before: { assignedStaffId: b.assignedStaffId }, after: { assignedStaffId: null },
      });
      return toItem(updated);
    });
  }
}
