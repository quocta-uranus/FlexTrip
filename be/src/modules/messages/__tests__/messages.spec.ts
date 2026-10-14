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
    provider: await h.createUser('provider@example.com', [Role.PROVIDER]),
  });
  const open = async (from: U, to: U) =>
    (await h.req('post', '/messages/conversations', from.accessToken).send({ targetUserId: to.userId })).body.id as string;
  const send = (u: U, c: string, body: object) =>
    h.req('post', `/messages/conversations/${c}`, u.accessToken).send(body);
  const text = (u: U, c: string, content: string, extra: object = {}) => send(u, c, { type: 'TEXT', content, ...extra });

  describe('starting a conversation', () => {
    it('creates one conversation and reuses it from either side', async () => {
      const { traveler, provider } = await setup();
      const first = await h.req('post', '/messages/conversations', traveler.accessToken).send({ targetUserId: provider.userId });
      expect(first.status).toBe(201);
      expect(first.body.members).toHaveLength(2);
      expect(first.body.lastMessage).toBeNull();
      const second = await h.req('post', '/messages/conversations', provider.accessToken).send({ targetUserId: traveler.userId });
      expect(second.body.id).toBe(first.body.id);
    });

    it('rejects traveler↔traveler, provider↔provider, self and unknown users', async () => {
      const { traveler, provider } = await setup();
      const traveler2 = await h.createUser('t2@example.com', [Role.TRAVELER]);
      const provider2 = await h.createUser('p2@example.com', [Role.PROVIDER]);
      const start = (u: U, target: string) =>
        h.req('post', '/messages/conversations', u.accessToken).send({ targetUserId: target });
      expect((await start(traveler, traveler2.userId)).status).toBe(400);
      expect((await start(provider, provider2.userId)).status).toBe(400);
      expect((await start(traveler, traveler.userId)).status).toBe(400);
      expect((await start(traveler, 'missing-user')).status).toBe(404);
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

      const provider2 = await h.createUser('p2@example.com', [Role.PROVIDER]);
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
