import {
  BookingStatus, DisputePriority, DisputeStatus, DisputeType,
  ListingStatus, PaymentStatus, Prisma, Role, UserStatus,
} from '@prisma/client';
import request from 'supertest';
import { AuthHarness } from '../../../auth/__tests__/support/auth-harness';

let seq = 0;
const next = () => ++seq;

export interface UserOptions {
  roles?: Role[];
  status?: UserStatus;
  name?: string;
  email?: string;
  verified?: boolean;
  createdAt?: Date;
}

export async function createUser(h: AuthHarness, opts: UserOptions = {}) {
  const n = next();
  const roles = opts.roles ?? [Role.TRAVELER];
  const user = await h.prisma.user.create({
    data: {
      email: opts.email ?? `user${n}@example.test`,
      name: opts.name ?? `User ${n}`,
      password: 'unused-hash',
      status: opts.status ?? UserStatus.ACTIVE,
      emailVerifiedAt: opts.verified === false ? null : new Date(),
      ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
      roles: { create: roles.map((role) => ({ role })) },
    },
  });
  const accessToken = await h.jwt.signAsync(
    { sub: user.id, roles },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { ...user, accessToken };
}

export const createAdmin = (h: AuthHarness, name = 'Admin') =>
  createUser(h, { roles: [Role.ADMIN], name });

export async function createSession(h: AuthHarness, userId: string) {
  return h.prisma.authSession.create({
    data: {
      userId,
      refreshTokenHash: `hash-${next()}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600_000),
    },
  });
}

export async function createListing(
  h: AuthHarness,
  providerId: string,
  data: Partial<Prisma.ListingUncheckedCreateInput> = {},
) {
  return h.prisma.listing.create({
    data: {
      title: `Listing ${next()}`,
      description: 'Mô tả',
      price: new Prisma.Decimal(100000),
      location: 'Quận 1, TP.HCM',
      category: 'VEHICLE',
      imageUrls: ['https://img.example.test/1.jpg'],
      amenities: [],
      status: ListingStatus.ACTIVE,
      providerId,
      ...data,
    },
  });
}

export interface BookingOptions {
  travelerId: string;
  listingId: string;
  status?: BookingStatus;
  totalPrice?: number;
  startDate?: Date;
  endDate?: Date;
  createdAt?: Date;
  /** null = no payment row */
  payment?: { amount?: number; platformFee?: number; status?: PaymentStatus; createdAt?: Date } | null;
}

export async function createBooking(h: AuthHarness, o: BookingOptions) {
  const totalPrice = o.totalPrice ?? 1_000_000;
  const booking = await h.prisma.booking.create({
    data: {
      travelerId: o.travelerId,
      listingId: o.listingId,
      status: o.status ?? BookingStatus.COMPLETED,
      totalPrice: new Prisma.Decimal(totalPrice),
      startDate: o.startDate ?? new Date('2026-09-01T00:00:00Z'),
      endDate: o.endDate ?? new Date('2026-09-03T00:00:00Z'),
      ...(o.createdAt ? { createdAt: o.createdAt } : {}),
    },
  });
  if (o.payment !== null) {
    const amount = o.payment?.amount ?? totalPrice;
    await h.prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: new Prisma.Decimal(amount),
        platformFee: new Prisma.Decimal(o.payment?.platformFee ?? amount * 0.1),
        status: o.payment?.status ?? PaymentStatus.PAID,
        method: 'CARD',
        ...(o.payment?.createdAt ? { createdAt: o.payment.createdAt } : {}),
      },
    });
  }
  return booking;
}

export async function createDispute(
  h: AuthHarness,
  o: { bookingId: string; openedById: string; status?: DisputeStatus; type?: DisputeType; priority?: DisputePriority },
) {
  return h.prisma.dispute.create({
    data: {
      bookingId: o.bookingId,
      openedById: o.openedById,
      type: o.type ?? DisputeType.REFUND_REQUEST,
      priority: o.priority ?? DisputePriority.MEDIUM,
      status: o.status ?? DisputeStatus.OPEN,
      reason: 'Xe không đúng mô tả',
    },
  });
}

export function http(h: AuthHarness, token?: string) {
  const server = () => h.app.getHttpServer();
  const auth = (t: request.Test) => (token ? t.set('Authorization', `Bearer ${token}`) : t);
  return {
    get: (path: string) => auth(request(server()).get('/api/v1' + path)),
    post: (path: string, body: object = {}) => auth(request(server()).post('/api/v1' + path)).send(body),
    patch: (path: string, body: object = {}) => auth(request(server()).patch('/api/v1' + path)).send(body),
    put: (path: string, body: object = {}) => auth(request(server()).put('/api/v1' + path)).send(body),
    delete: (path: string) => auth(request(server()).delete('/api/v1' + path)),
  };
}
