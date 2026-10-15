import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, ListingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BlockDatesDto,
  RentalConfigDto,
  UnblockDatesDto,
} from './dto/availability.dto';

// Booking statuses that occupy inventory
const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING_APPROVAL,
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
];

export interface AvailabilityCheckResult {
  available: boolean;
  reason?:
    | 'BLOCKED_DATE'
    | 'INSUFFICIENT_STOCK'
    | 'MIN_RENTAL_DAYS'
    | 'MAX_RENTAL_DAYS';
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Public: get blocked + booked dates in range ──────────────────────────

  async getAvailability(listingId: string, from: string, to: string) {
    await this.assertListingExists(listingId);

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (fromDate > toDate) throw new BadRequestException('from phải trước to');

    const [manualBlocks, activeBookings, activeHolds, listing] = await Promise.all([
      this.prisma.listingAvailability.findMany({
        where: {
          listingId,
          date: { gte: fromDate, lte: toDate },
          isBlocked: true,
        },
        select: { date: true, note: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.booking.findMany({
        where: {
          listingId,
          OR: [
            { status: { in: ACTIVE_STATUSES } },
            {
              status: BookingStatus.PENDING_PAYMENT,
              holdExpiresAt: { gt: new Date() },
            },
          ],
          startDate: { lte: toDate },
          endDate: { gte: fromDate },
        },
        select: { startDate: true, endDate: true, quantity: true },
      }),
      this.prisma.cartItem.findMany({
        where: {
          listingId,
          holdExpiresAt: { gt: new Date() },
          startDate: { lte: toDate },
          endDate: { gte: fromDate },
        },
        select: { startDate: true, endDate: true, quantity: true },
      }),
      this.prisma.listing.findUnique({
        where: { id: listingId },
        select: {
          quantity: true,
          minRentalDays: true,
          maxRentalDays: true,
          depositRate: true,
        },
      }),
    ]);

    // Build day-level occupancy map for the range
    const occupancy: Record<string, number> = {};
    const addOccupancy = (s: Date, e: Date, qty: number) => {
      const cur = new Date(Math.max(s.getTime(), fromDate.getTime()));
      const end = new Date(Math.min(e.getTime(), toDate.getTime()));
      while (cur <= end) {
        const key = cur.toISOString().slice(0, 10);
        occupancy[key] = (occupancy[key] ?? 0) + qty;
        cur.setDate(cur.getDate() + 1);
      }
    };

    for (const b of activeBookings) addOccupancy(new Date(b.startDate), new Date(b.endDate), b.quantity);
    for (const h of activeHolds)    addOccupancy(new Date(h.startDate), new Date(h.endDate), h.quantity);

    const totalQty = listing!.quantity;
    const fullyBookedDates = Object.entries(occupancy)
      .filter(([, qty]) => qty >= totalQty)
      .map(([date]) => date);

    return {
      listingId,
      from,
      to,
      config: listing,
      manuallyBlocked: manualBlocks.map((b) => ({
        date: b.date.toISOString().slice(0, 10),
        note: b.note,
      })),
      fullyBooked: fullyBookedDates,
    };
  }

  // ─── Core: check if a date range + quantity is available ─────────────────

  async checkAvailability(
    listingId: string,
    startDate: Date,
    endDate: Date,
    quantity: number,
    excludeCartItemId?: string,
    client?: Prisma.TransactionClient,
  ): Promise<AvailabilityCheckResult> {
    const prisma = client ?? this.prisma;
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { quantity: true, minRentalDays: true, maxRentalDays: true },
    });
    if (!listing) throw new NotFoundException('Listing không tồn tại');

    const rentalDays =
      Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;

    if (rentalDays < listing.minRentalDays)
      return { available: false, reason: 'MIN_RENTAL_DAYS' };

    if (listing.maxRentalDays && rentalDays > listing.maxRentalDays)
      return { available: false, reason: 'MAX_RENTAL_DAYS' };

    // Manual blocked dates
    const blocked = await prisma.listingAvailability.findFirst({
      where: {
        listingId,
        isBlocked: true,
        date: { gte: startDate, lte: endDate },
      },
    });
    if (blocked) return { available: false, reason: 'BLOCKED_DATE' };

    // ── Day-level occupancy check ─────────────────────────────────────────
    // Fetch all active bookings that overlap with the requested range
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        listingId,
        OR: [
          { status: { in: ACTIVE_STATUSES } },
          {
            status: BookingStatus.PENDING_PAYMENT,
            holdExpiresAt: { gt: new Date() },
          },
        ],
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { startDate: true, endDate: true, quantity: true },
    });

    // Fetch all active cart holds that overlap with the requested range
    // (excluding the caller's own cart item if re-checking after an edit)
    const overlappingHolds = await prisma.cartItem.findMany({
      where: {
        listingId,
        holdExpiresAt: { gt: new Date() },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        ...(excludeCartItemId ? { id: { not: excludeCartItemId } } : {}),
      },
      select: { startDate: true, endDate: true, quantity: true },
    });

    // Build per-day occupancy and find the peak occupied quantity in the range
    const occupancy: Record<string, number> = {};
    const dayMs = 86_400_000;

    const addOccupancy = (s: Date, e: Date, qty: number) => {
      const cur = new Date(Math.max(s.getTime(), startDate.getTime()));
      const end = new Date(Math.min(e.getTime(), endDate.getTime()));
      while (cur <= end) {
        const key = cur.toISOString().slice(0, 10);
        occupancy[key] = (occupancy[key] ?? 0) + qty;
        cur.setTime(cur.getTime() + dayMs);
      }
    };

    for (const b of overlappingBookings) addOccupancy(new Date(b.startDate), new Date(b.endDate), b.quantity);
    for (const h of overlappingHolds)    addOccupancy(new Date(h.startDate), new Date(h.endDate), h.quantity);

    const peakOccupied = Object.values(occupancy).length > 0
      ? Math.max(...Object.values(occupancy))
      : 0;

    if (listing.quantity - peakOccupied < quantity)
      return { available: false, reason: 'INSUFFICIENT_STOCK' };

    return { available: true };
  }

  // ─── Check availability excluding a specific booking (for modify requests) ─

  async checkAvailabilityExcludingBooking(
    bookingId: string,
    startDate: Date,
    endDate: Date,
    quantity: number,
    client?: Prisma.TransactionClient,
  ): Promise<AvailabilityCheckResult> {
    const prisma = client ?? this.prisma;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { listingId: true },
    });
    if (!booking) throw new NotFoundException('Booking không tồn tại');

    const listing = await prisma.listing.findUnique({
      where: { id: booking.listingId },
      select: { quantity: true, minRentalDays: true, maxRentalDays: true },
    });
    if (!listing) throw new NotFoundException('Listing không tồn tại');

    const rentalDays =
      Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;

    if (rentalDays < listing.minRentalDays)
      return { available: false, reason: 'MIN_RENTAL_DAYS' };
    if (listing.maxRentalDays && rentalDays > listing.maxRentalDays)
      return { available: false, reason: 'MAX_RENTAL_DAYS' };

    const blocked = await prisma.listingAvailability.findFirst({
      where: {
        listingId: booking.listingId,
        isBlocked: true,
        date: { gte: startDate, lte: endDate },
      },
    });
    if (blocked) return { available: false, reason: 'BLOCKED_DATE' };

    // ── Day-level occupancy check (excluding this booking) ────────────────
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        listingId: booking.listingId,
        OR: [
          { status: { in: ACTIVE_STATUSES } },
          {
            status: BookingStatus.PENDING_PAYMENT,
            holdExpiresAt: { gt: new Date() },
          },
        ],
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        id: { not: bookingId }, // exclude the booking being modified
      },
      select: { startDate: true, endDate: true, quantity: true },
    });

    const overlappingHolds = await prisma.cartItem.findMany({
      where: {
        listingId: booking.listingId,
        holdExpiresAt: { gt: new Date() },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { startDate: true, endDate: true, quantity: true },
    });

    const occupancy: Record<string, number> = {};
    const dayMs = 86_400_000;

    const addOccupancy = (s: Date, e: Date, qty: number) => {
      const cur = new Date(Math.max(s.getTime(), startDate.getTime()));
      const end = new Date(Math.min(e.getTime(), endDate.getTime()));
      while (cur <= end) {
        const key = cur.toISOString().slice(0, 10);
        occupancy[key] = (occupancy[key] ?? 0) + qty;
        cur.setTime(cur.getTime() + dayMs);
      }
    };

    for (const b of overlappingBookings) addOccupancy(new Date(b.startDate), new Date(b.endDate), b.quantity);
    for (const h of overlappingHolds)    addOccupancy(new Date(h.startDate), new Date(h.endDate), h.quantity);

    const peakOccupied = Object.values(occupancy).length > 0
      ? Math.max(...Object.values(occupancy))
      : 0;

    if (listing.quantity - peakOccupied < quantity)
      return { available: false, reason: 'INSUFFICIENT_STOCK' };

    return { available: true };
  }

  // ─── Provider: block dates ────────────────────────────────────────────────

  async blockDates(listingId: string, providerId: string, dto: BlockDatesDto) {
    await this.assertOwner(listingId, providerId);

    const records = dto.dates.map((d) => ({
      listingId,
      date: new Date(d),
      isBlocked: true,
      note: dto.note ?? null,
    }));

    await this.prisma.listingAvailability.createMany({
      data: records,
      skipDuplicates: true,
    });

    // Update any existing records that were unblocked
    await this.prisma.listingAvailability.updateMany({
      where: {
        listingId,
        date: { in: records.map((r) => r.date) },
        isBlocked: false,
      },
      data: { isBlocked: true, note: dto.note ?? null },
    });

    return { blocked: dto.dates.length };
  }

  // ─── Provider: unblock dates ──────────────────────────────────────────────

  async unblockDates(
    listingId: string,
    providerId: string,
    dto: UnblockDatesDto,
  ) {
    await this.assertOwner(listingId, providerId);

    const dates = dto.dates.map((d) => new Date(d));

    const { count } = await this.prisma.listingAvailability.deleteMany({
      where: { listingId, date: { in: dates } },
    });

    return { unblocked: count };
  }

  // ─── Public: get rental config ────────────────────────────────────────────

  async getRentalConfig(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        minRentalDays: true,
        maxRentalDays: true,
        quantity: true,
        depositRate: true,
      },
    });
    if (!listing) throw new NotFoundException('Listing không tồn tại');
    return listing;
  }

  // ─── Provider: update rental config ──────────────────────────────────────

  async updateRentalConfig(
    listingId: string,
    providerId: string,
    dto: RentalConfigDto,
  ) {
    await this.assertOwner(listingId, providerId);

    if (dto.maxRentalDays && dto.maxRentalDays < dto.minRentalDays)
      throw new BadRequestException(
        'maxRentalDays phải lớn hơn hoặc bằng minRentalDays',
      );

    return this.prisma.listing.update({
      where: { id: listingId },
      data: {
        minRentalDays: dto.minRentalDays,
        maxRentalDays: dto.maxRentalDays ?? null,
      },
      select: {
        id: true,
        minRentalDays: true,
        maxRentalDays: true,
        quantity: true,
        depositRate: true,
      },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async assertListingExists(listingId: string) {
    const exists = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Listing không tồn tại');
  }

  private async assertOwner(listingId: string, providerId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, providerId: true, status: true },
    });
    if (!listing) throw new NotFoundException('Listing không tồn tại');
    if (listing.providerId !== providerId)
      throw new ForbiddenException('Bạn không phải chủ sở hữu listing này');
    if (
      listing.status === ListingStatus.SUSPENDED ||
      listing.status === ListingStatus.REMOVED
    ) {
      throw new ForbiddenException({
        code: 'LISTING_LOCKED_BY_ADMIN',
        message: 'Tin đăng đang bị quản trị viên khoá.',
      });
    }
  }
}
