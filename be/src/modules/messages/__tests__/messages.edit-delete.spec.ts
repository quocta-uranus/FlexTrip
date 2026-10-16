import { Role } from '@prisma/client';
import { ChatHarness } from './support/chat-harness';

type U = { userId: string; accessToken: string };

describe('MSG-02 edit and delete', () => {
  const h = new ChatHarness();
  beforeAll(() => h.open());
  afterAll(() => h.close());
  beforeEach(() => h.reset());

  async function setup() {
    const traveler = await h.createUser('traveler@example.com', [Role.TRAVELER]);
    const provider = await h.createUser('provider@example.com', [Role.PROVIDER]);
    const c = (await h.req('post', '/messages/conversations', traveler.accessToken).send({ targetUserId: provider.userId })).body.id as string;
    return { traveler, provider, c };
  }
  const send = (u: U, c: string, body: object) => h.req('post', `/messages/conversations/${c}`, u.accessToken).send(body);
  const edit = (u: U, id: string, content: string) => h.req('patch', `/messages/${id}`, u.accessToken).send({ content });
  const del = (u: U, id: string) => h.req('delete', `/messages/${id}`, u.accessToken);

  it('lets the sender edit text and marks it edited', async () => {
    const { traveler, c } = await setup();
    const m = (await send(traveler, c, { type: 'TEXT', content: 'cũ' })).body;
    const res = await edit(traveler, m.id, 'mới');
    expect(res.status).toBe(200);
    expect(res.body.content).toBe('mới');
    expect(res.body.editedAt).not.toBeNull();
  });

  it('recomputes link previews when the text changes', async () => {
    const { traveler, c } = await setup();
    const listing = await h.prisma.listing.create({
      data: { title: 'Xe máy', description: 'd', price: 1, location: 'HN', category: 'VEHICLE', imageUrls: [], status: 'ACTIVE', providerId: (await h.prisma.user.findFirstOrThrow({ where: { email: 'provider@example.com' } })).id },
    });
    const m = (await send(traveler, c, { type: 'TEXT', content: 'chưa có link' })).body;
    const res = await edit(traveler, m.id, `http://localhost:3000/listings/${listing.id}`);
    expect(res.body.listingPreviews).toHaveLength(1);
  });

  it('rejects edits by others, of non-text and of deleted messages, and empty content', async () => {
    const { traveler, provider, c } = await setup();
    const text = (await send(traveler, c, { type: 'TEXT', content: 'a' })).body;
    const loc = (await send(traveler, c, { type: 'LOCATION', latitude: 1, longitude: 2 })).body;
    expect((await edit(provider, text.id, 'hack')).status).toBe(403);
    expect((await edit(traveler, loc.id, 'x')).status).toBe(400);
    expect((await edit(traveler, text.id, '   ')).status).toBe(400);
    await del(traveler, text.id);
    expect((await edit(traveler, text.id, 'x')).status).toBe(400);
    expect((await edit(traveler, 'missing', 'x')).status).toBe(404);
  });

  it('soft-deletes, masks content for both sides and is idempotent', async () => {
    const { traveler, provider, c } = await setup();
    const m = (await send(traveler, c, { type: 'TEXT', content: 'bí mật' })).body;
    expect((await del(traveler, m.id)).body).toEqual({ ok: true });
    expect((await del(traveler, m.id)).body).toEqual({ ok: true });
    const seen = (await h.req('get', `/messages/conversations/${c}`, provider.accessToken)).body.items[0];
    expect(seen).toMatchObject({ id: m.id, content: null, attachments: [], listingPreviews: [] });
    expect(seen.deletedAt).not.toBeNull();
    expect(await h.prisma.message.count({ where: { id: m.id } })).toBe(1);
  });

  it('refuses deletion by someone else', async () => {
    const { traveler, provider, c } = await setup();
    const m = (await send(traveler, c, { type: 'TEXT', content: 'a' })).body;
    expect((await del(provider, m.id)).status).toBe(403);
    expect((await del(provider, 'missing')).status).toBe(404);
  });

  it('shows replies to a deleted message as recalled', async () => {
    const { traveler, provider, c } = await setup();
    const original = (await send(traveler, c, { type: 'TEXT', content: 'gốc' })).body;
    const reply = (await send(provider, c, { type: 'TEXT', content: 'trả lời', replyToId: original.id })).body;
    await del(traveler, original.id);
    const page = (await h.req('get', `/messages/conversations/${c}`, provider.accessToken)).body;
    const found = page.items.find((m: { id: string }) => m.id === reply.id);
    expect(found.replyTo).toMatchObject({ id: original.id, content: null, deleted: true });
  });
});
