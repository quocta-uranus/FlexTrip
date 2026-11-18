import { ListingStatus, Role } from '@prisma/client';
import { ChatHarness } from './support/chat-harness';

type U = { userId: string; accessToken: string };

describe('MSG-01 conversations and messages', () => {
  const h = new ChatHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(() => h.reset());

  const setup = async () => ({
    traveler: await h.createUser('traveler@example.com', [Role.TRAVELER]),
    provider: await h.createUser('staff@example.com', [Role.STAFF]),
  });
  // `provider` ở đây là Staff được gán; Traveler/Provider không chat trực tiếp với nhau.
  const open = (user: U, staff: U) => h.openChat(user, staff);
  const send = (u: U, c: string, body: object) =>
    h.req('post', `/messages/conversations/${c}`, u.accessToken).send(body);
  const text = (u: U, c: string, content: string, extra: object = {}) => send(u, c, { type: 'TEXT', content, ...extra });

  describe('starting a conversation', () => {
    it('creates one conversation with the assigned staff and reuses it from either side', async () => {
      const { traveler, provider: staff } = await setup();
      const id = await open(traveler, staff);
      const info = (await h.req('get', `/messages/conversations/${id}/info`, traveler.accessToken)).body;
      expect(info.members).toHaveLength(2);
      expect(info.lastMessage).toBeNull();
      const again = await h.req('post', '/messages/conversations', staff.accessToken).send({ targetUserId: traveler.userId });
      expect(again.status).toBe(201);
      expect(again.body.id).toBe(id);
    });

    it('lets the provider of an assigned booking chat with that staff', async () => {
      const { provider: staff } = await setup();
      const traveler = await h.createUser('t@example.com', [Role.TRAVELER]);
      await open(traveler, staff);
      const booking = await h.prisma.booking.findFirstOrThrow({ include: { listing: true } });
      const token = await h.jwt.signAsync({ sub: booking.listing.providerId, roles: [Role.PROVIDER] }, { secret: process.env.JWT_ACCESS_SECRET });
      expect((await h.req('post', '/messages/conversations', token).send({ targetUserId: staff.userId })).status).toBe(201);
    });

    it('forbids traveler↔provider, traveler↔traveler, staff↔staff and self chats', async () => {
      const { traveler, provider: staff } = await setup();
      const owner = await h.createUser('owner@example.com', [Role.PROVIDER]);
      const traveler2 = await h.createUser('t2@example.com', [Role.TRAVELER]);
      const staff2 = await h.createUser('s2@example.com', [Role.STAFF]);
      const start = (u: U, target: string) =>
        h.req('post', '/messages/conversations', u.accessToken).send({ targetUserId: target });
      expect((await start(traveler, owner.userId)).status).toBe(400);
      expect((await start(owner, traveler.userId)).status).toBe(400);
      expect((await start(traveler, traveler2.userId)).status).toBe(400);
      expect((await start(staff, staff2.userId)).status).toBe(400);
      expect((await start(traveler, traveler.userId)).status).toBe(400);
      expect((await start(traveler, 'missing-user')).status).toBe(404);
    });

    it('forbids chatting with a staff who is not assigned to any of the user bookings', async () => {
      const { traveler, provider: staff } = await setup();
      const res = await h.req('post', '/messages/conversations', traveler.accessToken).send({ targetUserId: staff.userId });
      expect(res.status).toBe(403);
    });

    it('hides and blocks legacy traveler↔provider conversations', async () => {
      const { traveler } = await setup();
      const owner = await h.createUser('owner@example.com', [Role.PROVIDER]);
      const legacy = await h.prisma.conversation.create({
        data: {
          pairKey: [traveler.userId, owner.userId].sort().join(':'),
          members: { create: [{ userId: traveler.userId }, { userId: owner.userId }] },
          messages: { create: { content: 'cũ', senderId: owner.userId } },
        },
      });
      expect((await h.req('get', '/messages/conversations', traveler.accessToken)).body).toEqual([]);
      expect((await text(traveler, legacy.id, 'xin chào')).status).toBe(403);
    });

    it('requires authentication', async () => {
      expect((await h.req('get', '/messages/conversations')).status).toBe(401);
    });
  });

  describe('listing and info', () => {
    it('hides empty conversations from the list but serves them via /info to members only', async () => {
      const { traveler, provider } = await setup();
      const outsider = await h.createUser('o@example.com', [Role.PROVIDER]);
      const c = await open(traveler, provider);
      expect((await h.req('get', '/messages/conversations', traveler.accessToken)).body).toEqual([]);
      expect((await h.req('get', `/messages/conversations/${c}/info`, traveler.accessToken)).body.id).toBe(c);
      expect((await h.req('get', `/messages/conversations/${c}/info`, outsider.accessToken)).status).toBe(403);
    });

    it('shows the conversation with lastMessage and per-user unreadCount after a message', async () => {
      const { traveler, provider } = await setup();
      const c = await open(traveler, provider);
      await text(traveler, c, 'xin chào');
      const forProvider = (await h.req('get', '/messages/conversations', provider.accessToken)).body;
      const forTraveler = (await h.req('get', '/messages/conversations', traveler.accessToken)).body;
      expect(forProvider[0].lastMessage.content).toBe('xin chào');
      expect(forProvider[0].unreadCount).toBe(1);
      expect(forTraveler[0].unreadCount).toBe(0);
    });
  });

  describe('sending text', () => {
    it('trims, stores and returns the message', async () => {
      const { traveler, provider } = await setup();
      const c = await open(traveler, provider);
      const res = await text(traveler, c, '  xin chào  ');
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        type: 'TEXT', content: 'xin chào', senderId: traveler.userId, conversationId: c,
        attachments: [], replyTo: null, listingPreviews: [], editedAt: null, deletedAt: null,
      });
    });

    it('rejects empty text, text with a location, and non-members', async () => {
      const { traveler, provider } = await setup();
      const outsider = await h.createUser('o@example.com', [Role.TRAVELER]);
      const c = await open(traveler, provider);
      expect((await text(traveler, c, '   ')).status).toBe(400);
      expect((await send(traveler, c, { type: 'TEXT', content: 'x', latitude: 1, longitude: 1 })).status).toBe(400);
      expect((await text(outsider, c, 'hi')).status).toBe(403);
    });
  });

  describe('history', () => {
    it('pages newest-first with a cursor and no duplicates', async () => {
      const { traveler, provider } = await setup();
      const c = await open(traveler, provider);
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) ids.push((await text(traveler, c, `m${i}`)).body.id);
      const page = (cursor?: string) =>
        h.req('get', `/messages/conversations/${c}?limit=2${cursor ? `&cursor=${cursor}` : ''}`, provider.accessToken);
      const p1 = (await page()).body;
      expect(p1.items.map((m: { id: string }) => m.id)).toEqual([ids[4], ids[3]]);
      expect(p1.nextCursor).toBe(ids[3]);
      const p2 = (await page(p1.nextCursor)).body;
      expect(p2.items.map((m: { id: string }) => m.id)).toEqual([ids[2], ids[1]]);
      const p3 = (await page(p2.nextCursor)).body;
      expect(p3.items.map((m: { id: string }) => m.id)).toEqual([ids[0]]);
      expect(p3.nextCursor).toBeNull();
    });

    it('rejects non-members and out-of-range limits', async () => {
      const { traveler, provider } = await setup();
      const outsider = await h.createUser('o@example.com', [Role.TRAVELER]);
      const c = await open(traveler, provider);
      expect((await h.req('get', `/messages/conversations/${c}`, outsider.accessToken)).status).toBe(403);
      expect((await h.req('get', `/messages/conversations/${c}?limit=101`, traveler.accessToken)).status).toBe(400);
    });
  });

  describe('reply', () => {
    it('returns a reply snippet and refuses replies across conversations', async () => {
      const { traveler, provider } = await setup();
      const c = await open(traveler, provider);
      const original = await text(traveler, c, 'xin chào');
      const reply = await text(provider, c, 'chào bạn', { replyToId: original.body.id });
      expect(reply.body.replyTo).toEqual({
        id: original.body.id, senderId: traveler.userId, type: 'TEXT', content: 'xin chào', deleted: false,
      });

      const provider2 = await h.createUser('s2@example.com', [Role.STAFF]);
      const c2 = await open(traveler, provider2);
      const foreign = await text(traveler, c2, 'khác');
      expect((await text(provider, c, 'x', { replyToId: foreign.body.id })).status).toBe(400);
    });
  });

  describe('listing link previews', () => {
    it('attaches a preview only for ACTIVE internal listing links', async () => {
      const { traveler, provider } = await setup();
      const c = await open(traveler, provider);
      const mk = (status: ListingStatus) =>
        h.prisma.listing.create({
          data: {
            title: 'Lều 4 người', description: 'd', price: 150000, location: 'Đà Lạt',
            category: 'CAMPING_TREKKING', imageUrls: ['https://img.test/1.jpg'], status, providerId: provider.userId,
          },
        });
      const active = await mk(ListingStatus.ACTIVE);
      const draft = await mk(ListingStatus.DRAFT);

      const ok = await text(traveler, c, `Xem giúp http://localhost:3000/listings/${active.id} nhé`);
      expect(ok.body.listingPreviews).toEqual([
        { id: active.id, title: 'Lều 4 người', imageUrl: 'https://img.test/1.jpg', price: 150000, currency: 'VND', location: 'Đà Lạt' },
      ]);
      expect((await text(traveler, c, `http://localhost:3000/listings/${draft.id}`)).body.listingPreviews).toEqual([]);
      expect((await text(traveler, c, `https://evil.example/listings/${active.id}`)).body.listingPreviews).toEqual([]);
    });
  });

  describe('location', () => {
    it('accepts valid coordinates and rejects invalid ones', async () => {
      const { traveler, provider } = await setup();
      const c = await open(traveler, provider);
      const ok = await send(traveler, c, { type: 'LOCATION', latitude: 21.0285, longitude: 105.8542, locationLabel: 'Hồ Gươm' });
      expect(ok.status).toBe(201);
      expect(ok.body).toMatchObject({ type: 'LOCATION', latitude: 21.0285, longitude: 105.8542, locationLabel: 'Hồ Gươm', content: '' });
      expect((await send(traveler, c, { type: 'LOCATION', latitude: 91, longitude: 0 })).status).toBe(400);
      expect((await send(traveler, c, { type: 'LOCATION', latitude: 10 })).status).toBe(400);
    });

    it('rejects LOCATION with null coordinates', async () => {
      const { traveler, provider } = await setup();
      const c = await open(traveler, provider);
      expect((await send(traveler, c, { type: 'LOCATION', latitude: null, longitude: null })).status).toBe(400);
      expect((await send(traveler, c, { type: 'LOCATION', latitude: 10, longitude: null })).status).toBe(400);
    });

    it('stores zero coordinates as 0, not null', async () => {
      const { traveler, provider } = await setup();
      const c = await open(traveler, provider);
      const res = await send(traveler, c, { type: 'LOCATION', latitude: 0, longitude: 0 });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ latitude: 0, longitude: 0 });
    });

    it('ignores null location fields on a TEXT message', async () => {
      const { traveler, provider } = await setup();
      const c = await open(traveler, provider);
      const res = await text(traveler, c, 'hi', { latitude: null, longitude: null });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ latitude: null, longitude: null });
    });
  });

  describe('read receipts', () => {
    it('marks the other side\'s messages read and clears unreadCount', async () => {
      const { traveler, provider } = await setup();
      const c = await open(traveler, provider);
      const m = await text(traveler, c, 'hi');
      expect((await h.req('post', `/messages/conversations/${c}/read`, provider.accessToken)).body).toEqual({ ok: true });
      const list = (await h.req('get', '/messages/conversations', provider.accessToken)).body;
      expect(list[0].unreadCount).toBe(0);
      const page = (await h.req('get', `/messages/conversations/${c}`, traveler.accessToken)).body;
      expect(page.items.find((x: { id: string }) => x.id === m.body.id).isRead).toBe(true);
    });
  });
});
