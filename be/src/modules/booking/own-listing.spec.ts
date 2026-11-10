import { jest } from '@jest/globals';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { ContractsService } from '../contracts/contracts.service';
import { BookingService } from './booking.service';
import { CartService } from '../cart/cart.service';

const OWNER = 'provider-1';
const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

describe('renting your own listing is rejected with OWN_LISTING', () => {
  const checkAvailability = jest.fn<() => Promise<unknown>>();
  const availability = { checkAvailability } as unknown as AvailabilityService;
  const tx = {
    $queryRaw: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    listing: {
      findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        id: 'l1', title: 'Lều', status: 'ACTIVE', price: 100, currency: 'VND', providerId: OWNER, quantity: 1, depositRate: 0.2,
      }),
    },
  };
  const prisma = {
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
    cart: {
      findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        items: [
          {
            id: 'i1', listingId: 'l1', startDate: tomorrow(), endDate: tomorrow(),
            holdExpiresAt: new Date(Date.now() + 600_000),
            listing: { id: 'l1', title: 'Lều', status: 'ACTIVE', price: 100, providerId: OWNER, quantity: 1, depositRate: 0.2 },
          },
        ],
      }),
    },
  } as unknown as PrismaService;

  const dto = { listingId: 'l1', startDate: tomorrow(), endDate: tomorrow() };
  const expected = { response: { code: 'OWN_LISTING' } };

  it('when creating a booking', async () => {
    const service = new BookingService(prisma, availability, {} as unknown as ContractsService, {} as never);
    await expect(service.create(OWNER, dto as never)).rejects.toMatchObject(expected);
  });

  it('when adding to the cart', async () => {
    await expect(new CartService(prisma, availability).addItem(OWNER, dto as never)).rejects.toMatchObject(expected);
  });

  it('when checking out a cart that holds it', async () => {
    await expect(new CartService(prisma, availability).checkout(OWNER, {} as never)).rejects.toMatchObject(expected);
  });

  it('does not block renting another provider listing', async () => {
    const service = new BookingService(prisma, availability, {} as unknown as ContractsService, {} as never);
    checkAvailability.mockRejectedValueOnce(new Error('reached availability'));
    await expect(service.create('traveler-9', dto as never)).rejects.toThrow('reached availability');
  });
});
