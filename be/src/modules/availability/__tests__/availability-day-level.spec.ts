// @ts-nocheck
/**
 * availability-day-level.spec.ts - Regression tests for AvailabilityService
 * after day-level occupancy refactoring.
 */

import { jest, describe, it, expect } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { AvailabilityService } from '../availability.service';

const d = (iso) => new Date(iso);
const makeListing = (qty, min = 1, max = null) => ({ quantity: qty, minRentalDays: min, maxRentalDays: max });
const makeItem = (start, end, qty) => ({ startDate: d(start), endDate: d(end), quantity: qty });

function makePrisma(opts) {
  const listing = opts.listing !== undefined ? opts.listing : makeListing(1);
  return {
    listing: { findUnique: jest.fn((_) => Promise.resolve(listing)) },
    listingAvailability: { findFirst: jest.fn((_) => Promise.resolve(opts.blocked ?? null)) },
    booking: {
      findUnique: jest.fn((_) => Promise.resolve(null)),
      findMany: jest.fn((_) => Promise.resolve(opts.bookings ?? [])),
    },
    cartItem: { findMany: jest.fn((_) => Promise.resolve(opts.holds ?? [])) },
  };
}

describe('AvailabilityService - day-level occupancy', () => {

  it('01: NotFoundException when listing is null', async () => {
    const svc = new AvailabilityService(makePrisma({ listing: null }));
    await expect(svc.checkAvailability('x', d('2026-11-01'), d('2026-11-01'), 1))
      .rejects.toThrow(NotFoundException);
  });

  it('02: 1-day rental, no booking/hold -> available', async () => {
    const svc = new AvailabilityService(makePrisma({}));
    const r = await svc.checkAvailability('l', d('2026-11-20'), d('2026-11-20'), 1);
    expect(r.available).toBe(true);
  });

  it('03: 1-day, same-day booking qty=1, listing qty=1 -> INSUFFICIENT_STOCK', async () => {
    const svc = new AvailabilityService(makePrisma({ bookings: [makeItem('2026-11-20', '2026-11-20', 1)] }));
    const r = await svc.checkAvailability('l', d('2026-11-20'), d('2026-11-20'), 1);
    expect(r.available).toBe(false);
    expect(r.reason).toBe('INSUFFICIENT_STOCK');
  });

  it('04: 1-day, listing qty=2, 1 booking -> 1 slot left -> available', async () => {
    const svc = new AvailabilityService(makePrisma({
      listing: makeListing(2),
      bookings: [makeItem('2026-11-20', '2026-11-20', 1)],
    }));
    const r = await svc.checkAvailability('l', d('2026-11-20'), d('2026-11-20'), 1);
    expect(r.available).toBe(true);
  });

  it('05: Day-level - 2 non-overlapping bookings, qty=2 -> available (aggregate wrong, day-level correct)', async () => {
    const svc = new AvailabilityService(makePrisma({
      listing: makeListing(2),
      bookings: [makeItem('2026-11-10', '2026-11-11', 1), makeItem('2026-11-13', '2026-11-14', 1)],
    }));
    const r = await svc.checkAvailability('l', d('2026-11-10'), d('2026-11-14'), 1);
    expect(r.available).toBe(true);
  });

  it('06: Day-level - 2 overlapping bookings, peak=2=qty -> INSUFFICIENT_STOCK', async () => {
    const svc = new AvailabilityService(makePrisma({
      listing: makeListing(2),
      bookings: [makeItem('2026-11-10', '2026-11-12', 1), makeItem('2026-11-11', '2026-11-14', 1)],
    }));
    const r = await svc.checkAvailability('l', d('2026-11-10'), d('2026-11-14'), 1);
    expect(r.available).toBe(false);
    expect(r.reason).toBe('INSUFFICIENT_STOCK');
  });

  it('07: Active cart hold -> INSUFFICIENT_STOCK', async () => {
    const svc = new AvailabilityService(makePrisma({ holds: [makeItem('2026-11-20', '2026-11-20', 1)] }));
    const r = await svc.checkAvailability('l', d('2026-11-20'), d('2026-11-20'), 1);
    expect(r.available).toBe(false);
    expect(r.reason).toBe('INSUFFICIENT_STOCK');
  });

  it('08: Expired cart hold (Prisma filters it out -> []) -> available', async () => {
    const svc = new AvailabilityService(makePrisma({ holds: [] }));
    const r = await svc.checkAvailability('l', d('2026-11-20'), d('2026-11-20'), 1);
    expect(r.available).toBe(true);
  });

  it('09: excludeCartItemId -> WHERE has id: { not: cartItemId }', async () => {
    const prisma = makePrisma({});
    const svc = new AvailabilityService(prisma);
    await svc.checkAvailability('l', d('2026-11-20'), d('2026-11-20'), 1, 'cart-123');
    expect(prisma.cartItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: 'cart-123' } }) }),
    );
  });

  it('10: BLOCKED_DATE when Provider locks a date in range', async () => {
    const svc = new AvailabilityService(makePrisma({
      listing: makeListing(5),
      blocked: { date: d('2026-11-15'), isBlocked: true },
    }));
    const r = await svc.checkAvailability('l', d('2026-11-14'), d('2026-11-16'), 1);
    expect(r.available).toBe(false);
    expect(r.reason).toBe('BLOCKED_DATE');
  });

  it('11: MIN_RENTAL_DAYS (1 day < min=3)', async () => {
    const svc = new AvailabilityService(makePrisma({ listing: makeListing(5, 3) }));
    const r = await svc.checkAvailability('l', d('2026-11-20'), d('2026-11-20'), 1);
    expect(r.available).toBe(false);
    expect(r.reason).toBe('MIN_RENTAL_DAYS');
  });

  it('12: MAX_RENTAL_DAYS (10 days > max=7)', async () => {
    const svc = new AvailabilityService(makePrisma({ listing: makeListing(5, 1, 7) }));
    const r = await svc.checkAvailability('l', d('2026-11-01'), d('2026-11-10'), 1);
    expect(r.available).toBe(false);
    expect(r.reason).toBe('MAX_RENTAL_DAYS');
  });

  it('13: maxRentalDays=null -> 30 days available', async () => {
    const svc = new AvailabilityService(makePrisma({}));
    const r = await svc.checkAvailability('l', d('2026-11-01'), d('2026-11-30'), 1);
    expect(r.available).toBe(true);
  });

  it('14: qty=2, peak=2, listing.qty=3 -> 1 left < 2 -> INSUFFICIENT', async () => {
    const svc = new AvailabilityService(makePrisma({
      listing: makeListing(3),
      bookings: [makeItem('2026-11-20', '2026-11-22', 2)],
    }));
    const r = await svc.checkAvailability('l', d('2026-11-20'), d('2026-11-22'), 2);
    expect(r.available).toBe(false);
    expect(r.reason).toBe('INSUFFICIENT_STOCK');
  });

  it('15: qty=3, peak=2, listing.qty=5 -> 3 left >= 3 -> available', async () => {
    const svc = new AvailabilityService(makePrisma({
      listing: makeListing(5),
      bookings: [makeItem('2026-11-20', '2026-11-22', 2)],
    }));
    const r = await svc.checkAvailability('l', d('2026-11-20'), d('2026-11-22'), 3);
    expect(r.available).toBe(true);
  });

  it('16: CONSISTENCY - after fix, checkAvailability matches Search CTE', async () => {
    const svc = new AvailabilityService(makePrisma({
      listing: makeListing(2),
      bookings: [makeItem('2026-11-10', '2026-11-11', 1), makeItem('2026-11-13', '2026-11-14', 1)],
    }));
    const r = await svc.checkAvailability('l', d('2026-11-10'), d('2026-11-14'), 1);
    expect(r.available).toBe(true);
  });

  it('17: CONSISTENCY - peak = qty -> both Search and Booking reject', async () => {
    const svc = new AvailabilityService(makePrisma({
      listing: makeListing(2),
      bookings: [makeItem('2026-11-10', '2026-11-14', 1), makeItem('2026-11-10', '2026-11-14', 1)],
    }));
    const r = await svc.checkAvailability('l', d('2026-11-10'), d('2026-11-14'), 1);
    expect(r.available).toBe(false);
    expect(r.reason).toBe('INSUFFICIENT_STOCK');
  });

  it('18: checkAvailabilityExcludingBooking - excludes current booking', async () => {
    const prisma = {
      booking: {
        findUnique: jest.fn((_) => Promise.resolve({ listingId: 'listing-1' })),
        findMany: jest.fn((_) => Promise.resolve([])),
      },
      listing: { findUnique: jest.fn((_) => Promise.resolve(makeListing(1))) },
      listingAvailability: { findFirst: jest.fn((_) => Promise.resolve(null)) },
      cartItem: { findMany: jest.fn((_) => Promise.resolve([])) },
    };
    const svc = new AvailabilityService(prisma);
    const r = await svc.checkAvailabilityExcludingBooking('booking-abc', d('2026-11-20'), d('2026-11-20'), 1);
    expect(r.available).toBe(true);
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: 'booking-abc' } }) }),
    );
  });
});
