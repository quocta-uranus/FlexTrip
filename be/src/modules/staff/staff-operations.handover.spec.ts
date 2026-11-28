import { ConflictException } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { isBeforeRentalStart } from '../booking/booking.constants';
import { StaffOperationsService } from './staff-operations.service';

const DAY = 86_400_000;
const vnToday = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
const dayFromToday = (offset: number) => new Date(new Date(`${vnToday()}T00:00:00.000Z`).getTime() + offset * DAY);

describe('isBeforeRentalStart', () => {
  const start = new Date('2026-11-20T00:00:00.000Z');

  it('blocks the day before the rental starts', () => {
    expect(isBeforeRentalStart(start, new Date('2026-11-19T10:00:00Z'))).toBe(true);
  });

  it('allows the whole start day in Vietnam time, including 06:00', () => {
    // 2026-11-19T23:00Z is already 06:00 on the 20th in Vietnam
    expect(isBeforeRentalStart(start, new Date('2026-11-19T23:00:00Z'))).toBe(false);
    expect(isBeforeRentalStart(start, new Date('2026-11-20T09:00:00Z'))).toBe(false);
  });

  it('allows any later day', () => {
    expect(isBeforeRentalStart(start, new Date('2026-11-25T00:00:00Z'))).toBe(false);
  });
});

describe('StaffOperationsService.confirmHandover date rule', () => {
  const booking = (startDate: Date) => ({
    id: 'b1',
    status: BookingStatus.CONFIRMED,
    assignedStaffId: 'staff1',
    checkedInAt: null,
    startDate,
    endDate: new Date(startDate.getTime() + 5 * DAY),
    payment: { rentalAmount: 21000, rentalPaidAt: null },
    listing: { title: 'Lều trại' },
  });
  const make = (startDate: Date) => {
    const prisma = { booking: { findUnique: async () => booking(startDate) } };
    return new StaffOperationsService(prisma as never, {} as never, {} as never);
  };
  const dto = { checklist: [{ label: 'Đúng thiết bị', ok: true }] } as never;
  const ctx = {} as never;

  it('rejects a handover before the rental day with a Vietnamese reason', async () => {
    const err = await make(dayFromToday(1)).confirmHandover('staff1', 'b1', dto, ctx).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toMatchObject({ code: 'HANDOVER_TOO_EARLY' });
    expect(err.getResponse().message).toMatch(/^Chưa tới ngày thuê \(\d{2}\/\d{2}\/\d{4}\)/);
  });

  it('lets the rental day pass the date check (the next rule then applies)', async () => {
    const err = await make(dayFromToday(0)).confirmHandover('staff1', 'b1', dto, ctx).catch((e) => e);
    expect(err.getResponse()).toMatchObject({ code: 'RENTAL_UNPAID' });
  });

  it('lets a later day pass the date check', async () => {
    const err = await make(dayFromToday(-3)).confirmHandover('staff1', 'b1', dto, ctx).catch((e) => e);
    expect(err.getResponse()).toMatchObject({ code: 'RENTAL_UNPAID' });
  });

  it('rejects a handover after the rental has ended', async () => {
    const err = await make(dayFromToday(-6)).confirmHandover('staff1', 'b1', dto, ctx).catch((e) => e);
    expect(err.getResponse()).toMatchObject({ code: 'HANDOVER_TOO_LATE' });
  });
});
