import { BookingStatus, Role } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { createBooking, createListing, createUser, http } from './support/admin-fixtures';

describe('admin fixtures', () => {
  const h = new AuthHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(() => resetDatabase(h.prisma));

  it('creates a provider, listing, booking with payment and a usable token', async () => {
    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const traveler = await createUser(h);
    const listing = await createListing(h, provider.id);
    const booking = await createBooking(h, {
      travelerId: traveler.id,
      listingId: listing.id,
      status: BookingStatus.COMPLETED,
      totalPrice: 500000,
    });
    const payment = await h.prisma.payment.findUniqueOrThrow({ where: { bookingId: booking.id } });
    expect(Number(payment.platformFee)).toBe(50000);

    const me = await http(h, traveler.accessToken).get('/users/me');
    expect(me.status).toBe(200);
    expect(me.body.id).toBe(traveler.id);
  });

  it('resetDatabase empties every table', async () => {
    await createUser(h);
    await resetDatabase(h.prisma);
    expect(await h.prisma.user.count()).toBe(0);
  });
});
