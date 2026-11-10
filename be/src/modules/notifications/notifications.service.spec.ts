import { jest } from '@jest/globals';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService, resolveAudience } from './notifications.service';

describe('resolveAudience', () => {
  const booking = { travelerId: 'traveler-1', listing: { providerId: 'provider-1' } };

  it('classifies the traveler and the provider of a booking', () => {
    expect(resolveAudience('traveler-1', booking)).toBe('TRAVELER');
    expect(resolveAudience('provider-1', booking)).toBe('PROVIDER');
  });

  it('stays unclassified without a booking or for an unrelated recipient', () => {
    expect(resolveAudience('traveler-1', undefined)).toBeNull();
    expect(resolveAudience('someone-else', booking)).toBeNull();
  });

  it('stays unclassified when the recipient would be both sides', () => {
    expect(resolveAudience('same', { travelerId: 'same', listing: { providerId: 'same' } })).toBeNull();
  });
});

describe('NotificationsService.findAll audience', () => {
  const notification = (id: string, data: unknown) => ({
    id, type: 'BOOKING', title: 't', body: 'b', isRead: false, userId: 'dual-1', data, createdAt: new Date(),
  });

  it('adds audience with a single booking lookup and leaves old or generic rows unclassified', async () => {
    const items = [
      notification('n1', { bookingId: 'b-traveler' }),
      notification('n2', { bookingId: 'b-provider' }),
      notification('n3', { bookingId: 'b-traveler' }),
      notification('n4', null),
      notification('n5', { bookingId: 'b-missing' }),
      notification('n6', { conversationId: 'c1' }),
    ];
    const bookingFindMany = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
      { id: 'b-traveler', travelerId: 'dual-1', listing: { providerId: 'p-9' } },
      { id: 'b-provider', travelerId: 't-9', listing: { providerId: 'dual-1' } },
    ]);
    const prisma = {
      notification: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue(items),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(6),
      },
      booking: { findMany: bookingFindMany },
    } as unknown as PrismaService;

    const result = await new NotificationsService(prisma).findAll('dual-1', {});

    expect(result.items.map((n) => n.audience)).toEqual(['TRAVELER', 'PROVIDER', 'TRAVELER', null, null, null]);
    expect(bookingFindMany).toHaveBeenCalledTimes(1);
    expect(result.unreadCount).toBe(6);
  });

  it('skips the booking lookup when no notification references a booking', async () => {
    const bookingFindMany = jest.fn<() => Promise<unknown[]>>();
    const prisma = {
      notification: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([notification('n1', null)]),
        count: jest.fn<() => Promise<number>>().mockResolvedValue(1),
      },
      booking: { findMany: bookingFindMany },
    } as unknown as PrismaService;

    await new NotificationsService(prisma).findAll('dual-1', {});

    expect(bookingFindMany).not.toHaveBeenCalled();
  });
});
