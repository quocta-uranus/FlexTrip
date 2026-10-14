import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { paginate, skipTake } from '../../../common/dto/pagination.dto';
import { ListAdminBookingsQueryDto } from './dto/admin-bookings.dto';

const LIST_SELECT = {
  id: true, status: true, startDate: true, endDate: true,
  totalPrice: true, quantity: true, deliveryMethod: true, deliveryAddress: true,
  createdAt: true,
  listing: { select: { id: true, title: true, location: true, imageUrls: true } },
  traveler: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
  assignedStaff: {
    select: {
      id: true, name: true, avatarUrl: true,
      staffProfile: { select: { employeeCode: true } },
    },
  },
  payment: { select: { status: true, method: true } },
  _count: { select: { staffMediations: true } },
} satisfies Prisma.BookingSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  notes: true, cancelledBy: true, cancellationReason: true, cancelledAt: true,
  checkedInAt: true, checkedOutAt: true,
  listing: {
    select: {
      id: true, title: true, location: true, imageUrls: true, price: true, currency: true,
      provider: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
    },
  },
  assignedStaff: {
    select: {
      id: true, name: true, email: true, phone: true, avatarUrl: true,
      staffProfile: { select: { employeeCode: true, phone: true, regions: true } },
    },
  },
  payment: { select: { id: true, status: true, method: true, amount: true, transactionId: true } },
  contract: { select: { id: true, status: true, travelerSignedAt: true, providerSignedAt: true } },
  staffMediations: {
    select: { id: true, status: true, issue: true, resolution: true, createdAt: true },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.BookingSelect;

@Injectable()
export class AdminBookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const counts = await this.prisma.booking.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const total = await this.prisma.booking.count();
    const withStaff = await this.prisma.booking.count({ where: { assignedStaffId: { not: null } } });
    const statusMap = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Partial<Record<BookingStatus, number>>;
    return { total, withStaff, withoutStaff: total - withStaff, byStatus: statusMap };
  }

  async list(q: ListAdminBookingsQueryDto) {
    const search = q.search?.trim();
    const contains = (s: string) => ({ contains: s, mode: 'insensitive' as const });
    const where: Prisma.BookingWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.staffId ? { assignedStaffId: q.staffId } : {}),
      ...(q.hasStaff === true ? { assignedStaffId: { not: null } } : q.hasStaff === false ? { assignedStaffId: null } : {}),
      ...(q.from || q.to ? {
        startDate: {
          ...(q.from ? { gte: new Date(q.from) } : {}),
          ...(q.to   ? { lte: new Date(q.to) }   : {}),
        },
      } : {}),
      ...(search ? {
        OR: [
          { id: search },
          { listing: { title: contains(search) } },
          { listing: { location: contains(search) } },
          { traveler: { name: contains(search) } },
          { traveler: { email: contains(search) } },
        ],
      } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where, select: LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        ...skipTake(q),
      }),
      this.prisma.booking.count({ where }),
    ]);
    return paginate(rows, total, q);
  }

  async detail(id: string) {
    const b = await this.prisma.booking.findUnique({ where: { id }, select: DETAIL_SELECT });
    if (!b) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Không tìm thấy booking.' });
    return b;
  }
}
