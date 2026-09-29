import { ListingStatus, Role } from '@prisma/client';
import { AuthHarness, resetDatabase } from '../../auth/__tests__/support/auth-harness';
import { createListing, createUser, http } from '../../admin/__tests__/support/admin-fixtures';

describe('listing moderation rules', () => {
  const h = new AuthHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(async () => { await resetDatabase(h.prisma); h.redis.clear(); });

  it('users can flag, but not their own listing and not twice', async () => {
    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const traveler = await createUser(h);
    const listing = await createListing(h, provider.id);

    const ok = await http(h, traveler.accessToken).post(`/listings/${listing.id}/flags`, { reason: 'Giá ảo' });
    expect(ok.status).toBe(201);
    expect(ok.body.status).toBe('OPEN');
    expect((await http(h, traveler.accessToken).post(`/listings/${listing.id}/flags`, { reason: 'x' })).body.code).toBe('ALREADY_FLAGGED');
    expect((await http(h, provider.accessToken).post(`/listings/${listing.id}/flags`, { reason: 'x' })).body.code).toBe('CANNOT_FLAG_OWN_LISTING');
    expect((await http(h, traveler.accessToken).post(`/listings/${listing.id}/flags`, { reason: '' })).status).toBe(400);
    expect((await http(h).post(`/listings/${listing.id}/flags`, { reason: 'x' })).status).toBe(401);
  });

  it.each([ListingStatus.SUSPENDED, ListingStatus.REMOVED])('provider cannot touch a %s listing', async (status) => {
    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const listing = await createListing(h, provider.id, { status });
    const api = http(h, provider.accessToken);
    for (const res of [
      await api.patch(`/listings/${listing.id}/publish`),
      await api.patch(`/listings/${listing.id}/resume`),
      // title must satisfy UpdateListingDto's @MinLength(5) so the admin-lock check is reached
      await api.patch(`/listings/${listing.id}`, { title: 'Tiêu đề sửa' }),
      await api.delete(`/listings/${listing.id}`),
    ]) {
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('LISTING_LOCKED_BY_ADMIN');
    }
    expect((await h.prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).status).toBe(status);
  });

  it('public list shows only ACTIVE even if status is requested; REMOVED detail is 404', async () => {
    const provider = await createUser(h, { roles: [Role.PROVIDER] });
    const active = await createListing(h, provider.id);
    await createListing(h, provider.id, { status: ListingStatus.SUSPENDED });
    const removed = await createListing(h, provider.id, { status: ListingStatus.REMOVED });

    const list = await http(h).get('/listings?status=SUSPENDED');
    expect(list.body.items.map((l: { id: string }) => l.id)).toEqual([active.id]);
    expect((await http(h).get(`/listings/${removed.id}`)).status).toBe(404);
  });
});
