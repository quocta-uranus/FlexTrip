import { jest } from '@jest/globals';
import { Role } from '@prisma/client';
import { Socket } from 'socket.io-client';
import { ChatHarness, connect, nextEvent, sleep } from './support/chat-harness';

describe('MSG realtime delivery', () => {
  const h = new ChatHarness();
  let url: string;
  const sockets: Socket[] = [];
  beforeAll(async () => {
    await h.open();
    url = await h.listen();
  });
  afterAll(async () => {
    sockets.forEach((s) => s.close());
    await h.close();
  });
  beforeEach(() => h.reset());

  const track = async (p: Promise<Socket>) => {
    const s = await p;
    sockets.push(s);
    return s;
  };

  it('pushes new/updated/deleted/read to both members and nothing to outsiders', async () => {
    const traveler = await h.createUser('traveler@example.com', [Role.TRAVELER]);
    const provider = await h.createUser('provider@example.com', [Role.PROVIDER]);
    const outsider = await h.createUser('outsider@example.com', [Role.PROVIDER]);
    const c = (await h.req('post', '/messages/conversations', traveler.accessToken).send({ targetUserId: provider.userId })).body.id as string;
    const [st, sp, so] = await Promise.all([
      track(connect(url, traveler.accessToken)),
      track(connect(url, provider.accessToken)),
      track(connect(url, outsider.accessToken)),
    ]);
    const spy = jest.fn();
    for (const ev of ['message:new', 'message:updated', 'message:deleted', 'message:read']) so.on(ev, spy);

    const created = Promise.all([nextEvent<{ id: string }>(st, 'message:new'), nextEvent<{ id: string }>(sp, 'message:new')]);
    const sent = await h.req('post', `/messages/conversations/${c}`, traveler.accessToken).send({ type: 'TEXT', content: 'hi' });
    const [forSender, forReceiver] = await created;
    expect(forSender.id).toBe(sent.body.id);
    expect(forReceiver.id).toBe(sent.body.id);

    const updated = nextEvent<{ content: string; editedAt: string }>(sp, 'message:updated');
    await h.req('patch', `/messages/${sent.body.id}`, traveler.accessToken).send({ content: 'hi!' });
    expect(await updated).toMatchObject({ content: 'hi!' });

    const read = nextEvent<{ conversationId: string; readerId: string }>(st, 'message:read');
    await h.req('post', `/messages/conversations/${c}/read`, provider.accessToken);
    expect(await read).toEqual({ conversationId: c, readerId: provider.userId });

    const deleted = nextEvent<{ id: string; conversationId: string; deletedAt: string }>(sp, 'message:deleted');
    await h.req('delete', `/messages/${sent.body.id}`, traveler.accessToken);
    expect(await deleted).toMatchObject({ id: sent.body.id, conversationId: c });

    await sleep(200);
    expect(spy).not.toHaveBeenCalled();
  });
});
